'use strict';

const {
    prompts,
    agriSuggestions,
    seasonalSuggestions,
    timeSuggestions,
    produceByChoice,
    demoProducePrices,
    producePriceUnits
} = require('./data');

// Conversation states
const STATE = {
    START: 0,
    LANGUAGE: 1,
    SERVICE: 2,
    LOCATION: 3,
    BUSY: 4,
    ASK_MORE: 5,
    PRODUCE: 6,
    OTHER_PRODUCE: 7,
    WEATHER_PERIOD: 8,
    WEATHER_RETRY: 9
};

const NUMERIC_MENU_STATES = new Set([
    STATE.LANGUAGE,
    STATE.SERVICE,
    STATE.PRODUCE,
    STATE.WEATHER_PERIOD,
    STATE.WEATHER_RETRY
]);

const LANGUAGE_MENU = "Hello, welcome to Agri text. Please choose your native language:<br>1. English<br>2. isiZulu<br>3. Afrikaans<br>4. Sepedi<br>5. Tshivenda<br>6. Xitsonga";
const LANGUAGE_CHOICES = { '1': 'en', '2': 'zu', '3': 'af', '4': 'nso', '5': 've', '6': 'ts' };
const YES_WORDS = ['yes', 'y', '1', 'yebo', 'ja', 'ee'];
const NO_WORDS = ['no', 'n', '0', 'cha', 'nee', 'aowa'];
const FOLLOW_UP_DELAY_MS = 800;

function createSession() {
    return {
        state: STATE.START,
        lang: 'en',
        service: '',
        location: '',
        produce: '',
        weatherPeriod: ''
    };
}

function isNumericMenuState(state) {
    return NUMERIC_MENU_STATES.has(state);
}

function reply(text, delayMs = 0) {
    return { text, delayMs };
}

function dictFor(session) {
    return prompts[session.lang] || prompts.en;
}

/**
 * Advances the conversation for a session with the given user input.
 * Mutates the session and returns the list of bot replies to show.
 */
async function processMessage(session, rawInput) {
    const input = String(rawInput || '');
    const msg = input.trim().toLowerCase();
    const dict = dictFor(session);

    switch (session.state) {
        case STATE.START: {
            const detectedLanguage = detectGreetingLanguage(input);
            if (detectedLanguage) {
                session.lang = detectedLanguage;
                session.state = STATE.SERVICE;
                const greetingDict = prompts[session.lang];
                return [reply(`${greetingDict.greeting}<br>${greetingDict.askService}`)];
            }
            session.state = STATE.LANGUAGE;
            return [reply(LANGUAGE_MENU)];
        }

        case STATE.LANGUAGE: {
            const lang = LANGUAGE_CHOICES[msg];
            if (!lang) return [reply("Invalid choice. Please reply 1, 2, 3, 4, 5, or 6.")];
            session.lang = lang;
            session.state = STATE.SERVICE;
            return [reply(prompts[lang].askService)];
        }

        case STATE.SERVICE:
            if (msg === '1') {
                session.service = 'weather';
                session.state = STATE.WEATHER_PERIOD;
                return [reply(dict.askWeatherPeriod)];
            }
            if (msg === '2') {
                session.service = 'market';
                session.state = STATE.PRODUCE;
                return [reply(dict.askProduce)];
            }
            return [reply(dict.error)];

        case STATE.WEATHER_PERIOD:
            if (msg === '1') session.weatherPeriod = 'daily';
            else if (msg === '2') session.weatherPeriod = 'weekly';
            else return [reply(dict.error)];
            session.state = STATE.LOCATION;
            return [reply(dict.askLocation)];

        case STATE.WEATHER_RETRY:
            if (msg === '1') {
                session.state = STATE.BUSY;
                return respondWithWeather(session, session.location);
            }
            if (msg === '2') {
                session.state = STATE.LOCATION;
                return [reply(dict.askLocation)];
            }
            return [reply(dict.error)];

        case STATE.LOCATION:
            if (msg === '') return [reply(`${dict.error}<br>${dict.askLocation}`)];
            session.location = input;
            session.state = STATE.BUSY;
            return respondWithWeather(session, input);

        case STATE.PRODUCE:
            if (/^[1-7]$/.test(msg)) {
                const produceChoices = produceByChoice[session.lang] || produceByChoice.en;
                const priceIndex = Number(msg) - 1;
                return respondWithPriceInfo(session, produceChoices[priceIndex], priceIndex);
            }
            if (msg === '8') {
                session.state = STATE.OTHER_PRODUCE;
                return [reply(dict.askOtherProduce)];
            }
            return [reply(dict.error)];

        case STATE.OTHER_PRODUCE:
            if (!input.trim()) return [reply(dict.error)];
            return respondWithPriceInfo(session, input.trim());

        case STATE.ASK_MORE:
            if (YES_WORDS.includes(msg)) {
                session.state = STATE.SERVICE;
                return [reply(dict.askService)];
            }
            if (NO_WORDS.includes(msg)) {
                session.state = STATE.START;
                return [reply(dict.goodbye)];
            }
            return [reply(dict.yesNoError)];

        case STATE.BUSY:
        default:
            return [];
    }
}

function detectGreetingLanguage(input) {
    const normalized = input.toLocaleLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^[^\p{L}]+/u, '');
    const greetings = {
        nso: /^(dumela|dumelang|thobela)\b/,
        ve: /^(ndaa|aa)\b/,
        ts: /^(avuxeni|minjhani|xewani)\b/,
        zu: /^(sawubona|sanibonani|molo|molweni)\b/,
        af: /^(hallo|more|goeiemore|goeiemiddag|goienaand|goeie\s+(more|middag|naand))\b/,
        en: /^(hello|hi|hey|howdy|greetings|good\s+(morning|afternoon|evening))\b/
    };

    return Object.entries(greetings).find(([, pattern]) => pattern.test(normalized))?.[0] || null;
}

async function respondWithWeather(session, locationInput) {
    const lang = session.lang;
    const dict = dictFor(session);

    try {
        const { lat, lon, locationName } = await geocode(locationInput);
        const forecastDays = session.weatherPeriod === 'weekly' ? 7 : 1;
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=${forecastDays}&timezone=auto`);
        if (!weatherRes.ok) throw new Error("Weather forecast unavailable");
        const weatherData = await weatherRes.json();
        const localTime = weatherData.current_weather.time;
        const daily = weatherData.daily;
        if (!daily || !daily.time || daily.time.length === 0) {
            throw new Error("Weather forecast data is missing");
        }

        let finalMsg;
        if (session.weatherPeriod === 'weekly') {
            const days = daily.time.map((date, index) => {
                const dayName = new Intl.DateTimeFormat(getLocale(lang), {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC'
                }).format(new Date(`${date}T00:00:00Z`));
                const condition = getWeatherCondition(daily.weather_code[index], lang);
                return `${dayName}: ${condition}, ${daily.temperature_2m_min[index]}–${daily.temperature_2m_max[index]}°C, ${getRainChanceLabel(lang)} ${daily.precipitation_probability_max[index] ?? 0}%`;
            }).join('<br>');

            finalMsg = dict.weeklyWeatherResult
                .replace('{location}', escapeHtml(locationName))
                .replace('{days}', days)
                .replace('{season}', getSeasonalAdvice(localTime, lang));
        } else {
            const agriAdvice = [
                getAgriAdvice(weatherData.current_weather.weathercode, lang),
                getSeasonalAdvice(localTime, lang),
                getTimeAdvice(localTime, lang)
            ].join("<br>");
            finalMsg = dict.dailyWeatherResult
                .replace('{location}', escapeHtml(locationName))
                .replace('{condition}', getWeatherCondition(daily.weather_code[0], lang))
                .replace('{high}', daily.temperature_2m_max[0])
                .replace('{low}', daily.temperature_2m_min[0])
                .replace('{rain}', daily.precipitation_probability_max[0] ?? 0)
                .replace('{agri}', agriAdvice);
        }

        return [reply(finalMsg), ...continueConversation(session)];
    } catch (error) {
        console.error("API Error:", error.message);
        session.state = STATE.WEATHER_RETRY;
        return [reply(dict.weatherRetry.replace('{location}', escapeHtml(locationInput)))];
    }
}

async function geocode(locationInput) {
    const query = locationInput.trim();
    const isPostalCode = /^\d+$/.test(query);

    if (isPostalCode) {
        const zipRes = await fetch(`https://api.zippopotam.us/za/${encodeURIComponent(query)}`);
        if (!zipRes.ok) throw new Error("Postal code not found");
        const zipData = await zipRes.json();
        const place = zipData.places[0];
        return {
            lat: place.latitude,
            lon: place.longitude,
            locationName: `${place["place name"]}, ${place.state}`
        };
    }

    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&format=json`);
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) throw new Error("City not found");
    const result = geoData.results[0];
    return { lat: result.latitude, lon: result.longitude, locationName: result.name };
}

function respondWithPriceInfo(session, produce, priceIndex = null) {
    session.produce = produce;
    const dict = dictFor(session);
    const escapedProduce = escapeHtml(produce);
    const sample = priceIndex === null ? null : demoProducePrices[priceIndex];
    const priceMessage = sample
        ? dict.priceResult
            .replace('{produce}', escapedProduce)
            .replace('{price}', String(sample.price))
            .replace('{unit}', (producePriceUnits[session.lang] || producePriceUnits.en)[sample.unit])
        : dict.priceNotAvailable.replace('{produce}', escapedProduce);

    return [reply(priceMessage, 500), ...continueConversation(session)];
}

function continueConversation(session) {
    session.state = STATE.ASK_MORE;
    session.service = '';
    session.location = '';
    return [reply(dictFor(session).askMore, FOLLOW_UP_DELAY_MS)];
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getAgriAdvice(code, lang) {
    let condition = "default";
    if (code <= 2) condition = "sunny";
    else if (code === 3 || code === 45 || code === 48) condition = "cloudy";
    else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) condition = "rain";
    else if (code >= 95) condition = "storm";

    const langDict = agriSuggestions[lang] || agriSuggestions.en;
    return langDict[condition] || langDict.default;
}

function getLocale(lang) {
    return { en: 'en-ZA', zu: 'zu-ZA', af: 'af-ZA', nso: 'nso-ZA', ve: 've-ZA', ts: 'ts-ZA' }[lang] || 'en-ZA';
}

function getWeatherCondition(code, lang) {
    const conditions = {
        en: { clear: "Clear", mostlyClear: "Mostly clear", partlyCloudy: "Partly cloudy", overcast: "Overcast", fog: "Fog", drizzle: "Drizzle", rain: "Rain", snow: "Snow", showers: "Rain showers", snowShowers: "Snow showers", storm: "Thunderstorm" },
        zu: { clear: "Kucacile", mostlyClear: "Kucacile kakhulu", partlyCloudy: "Kunamafu athile", overcast: "Kuguqubele", fog: "Kunenkungu", drizzle: "Kunethonsi lemvula", rain: "Imvula", snow: "Iqhwa", showers: "Izihlambi zemvula", snowShowers: "Izihlambi zeqhwa", storm: "Ukuduma kwezulu" },
        af: { clear: "Helder", mostlyClear: "Meestal helder", partlyCloudy: "Gedeeltelik bewolk", overcast: "Bewolk", fog: "Mis", drizzle: "Motreën", rain: "Reën", snow: "Sneeu", showers: "Reënbuie", snowShowers: "Sneeubuie", storm: "Donderstorm" },
        nso: { clear: "Boso bjo bo hlakilego", mostlyClear: "Boso bjo bo hlakilego kudu", partlyCloudy: "Maru a se makae", overcast: "Maru a mantši", fog: "Mouwane", drizzle: "Pula ya go rotha", rain: "Pula", snow: "Lehlwa", showers: "Dipula tša go tšhologa", snowShowers: "Dipula tša lehlwa", storm: "Ledimo la pula" },
        ve: { clear: "A hu na makole", mostlyClear: "Makole maṱuku", partlyCloudy: "Hu na makole maṅwe", overcast: "Makole manzhi", fog: "Miḓamuthuthu", drizzle: "Mvula ṱhukhu", rain: "Mvula", snow: "Mahaḓa", showers: "Mvulanyana", snowShowers: "Mahaḓa", storm: "Maḓumbu" },
        ts: { clear: "A ku na mapapa", mostlyClear: "Mapapa matsongo", partlyCloudy: "Mapapa man'wana", overcast: "Ku tele hi mapapa", fog: "Munyama", drizzle: "Mpfula leyitsongo", rain: "Mpfula", snow: "Nghohe", showers: "Mikhehleketo ya mpfula", snowShowers: "Mikhehleketo ya nghohe", storm: "Xidzedze" }
    };
    const labels = conditions[lang] || conditions.en;
    if (code === 0) return labels.clear;
    if (code === 1) return labels.mostlyClear;
    if (code === 2) return labels.partlyCloudy;
    if (code === 3) return labels.overcast;
    if (code === 45 || code === 48) return labels.fog;
    if (code >= 51 && code <= 55) return labels.drizzle;
    if (code >= 56 && code <= 67) return labels.rain;
    if (code >= 71 && code <= 77) return labels.snow;
    if (code >= 80 && code <= 82) return labels.showers;
    if (code >= 85 && code <= 86) return labels.snowShowers;
    if (code >= 95) return labels.storm;
    return labels.overcast;
}

function getRainChanceLabel(lang) {
    return { en: "rain", zu: "imvula", af: "reën", nso: "pula", ve: "mvula", ts: "mpfula" }[lang] || "rain";
}

function getLocalDateParts(localTime) {
    const match = /^(\d{4})-(\d{2})-\d{2}T(\d{2}):/.exec(localTime || '');
    if (!match) throw new Error("Local forecast time is unavailable");
    return { month: Number(match[2]), hour: Number(match[3]) };
}

function getSeasonalAdvice(localTime, lang) {
    const { month } = getLocalDateParts(localTime);
    let season = "summer";
    if (month >= 3 && month <= 5) season = "autumn";
    else if (month >= 6 && month <= 8) season = "winter";
    else if (month >= 9 && month <= 11) season = "spring";

    const langDict = seasonalSuggestions[lang] || seasonalSuggestions.en;
    return langDict[season];
}

function getTimeAdvice(localTime, lang) {
    const { hour } = getLocalDateParts(localTime);
    let timeOfDay = "night";
    if (hour >= 5 && hour <= 9) timeOfDay = "morning";
    else if (hour >= 10 && hour <= 15) timeOfDay = "midday";
    else if (hour >= 16 && hour <= 19) timeOfDay = "evening";

    const langDict = timeSuggestions[lang] || timeSuggestions.en;
    return langDict[timeOfDay];
}

module.exports = { STATE, createSession, processMessage, isNumericMenuState };
