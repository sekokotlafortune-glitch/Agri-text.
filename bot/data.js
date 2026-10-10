'use strict';

const prompts = {
    en: {
        greeting: "Hello, welcome to Agri text.",
        askService: "Please choose an option:<br>1. Weather forecast<br>2. Produce prices",
        askWeatherPeriod: "Choose a forecast:<br>1. Daily weather<br>2. Weekly weather",
        weatherRetry: "I couldn't get that forecast for {location}. Reply 1 to retry the same request or 2 to enter a different location.",
        dailyWeatherResult: "Daily weather for {location}: {condition}, high {high}°C and low {low}°C. Rain chance: {rain}%.<br><br>{agri}",
        weeklyWeatherResult: "7-day weather forecast for {location}:<br>{days}<br><br>{season}",
        askMore: "Would you like to see the menu and make another request? Reply yes or no.",
        yesNoError: "Please reply yes or no.",
        goodbye: "Thanks for using Agri text. Press restart whenever you want to begin again.",
        askLocation: "Please enter your city, town, or SA postal code (e.g. 0700):",
        askProduce: "Which produce price would you like to check?<br>1. Tomatoes<br>2. Potatoes<br>3. Onions<br>4. Maize<br>5. Cabbage<br>6. Carrots<br>7. Apples<br>8. Other (type the produce name)",
        askOtherProduce: "Type the name of the produce you want to check:",
        priceResult: "DEMO PRICE — illustrative only, not a live market quote: {produce}: R{price} per {unit}.",
        priceNotAvailable: "There is no sample price configured for {produce}. Please choose one of the listed produce items to see an example.",
        weatherResult: "The weather for {location} is {temp}°C.<br><br>{agri}",
        error: "Invalid choice. Please try again.",
        notFound: "Sorry, we couldn't find data for '{location}'. Please check the spelling or postal code."
    },
    zu: {
        greeting: "Sawubona, wamukelekile ku-Agri text.",
        askService: "Sicela ukhethe inketho:<br>1. Isimo sezulu<br>2. Amanani omkhiqizo",
        askWeatherPeriod: "Khetha isibikezelo:<br>1. Isimo sezulu sansuku zonke<br>2. Isimo sezulu seviki",
        weatherRetry: "Angikwazanga ukuthola isibikezelo se-{location}. Phendula 1 ukuze uzame futhi ngesicelo esifanayo noma 2 ukuze ufake enye indawo.",
        dailyWeatherResult: "Isimo sezulu sanamuhla e-{location}: {condition}, izinga eliphezulu {high}°C neliphansi {low}°C. Amathuba emvula: {rain}%.<br><br>{agri}",
        weeklyWeatherResult: "Isibikezelo sezinsuku eziyi-7 e-{location}:<br>{days}<br><br>{season}",
        askMore: "Ungathanda ukubona imenyu wenze esinye isicelo? Phendula yebo noma cha.",
        yesNoError: "Sicela uphendule ngokuthi yebo noma cha.",
        goodbye: "Siyabonga ngokusebenzisa i-Agri text. Cindezela ukuqala kabusha uma ufuna ukuqala futhi.",
        askLocation: "Sicela ufake idolobha lakho noma ikhodi yeposi yase-SA (isib. 0700):",
        askProduce: "Imuphi umkhiqizo ofuna ukuwuhlolela inani?<br>1. Utamatisi<br>2. Amazambane<br>3. U-anyanisi<br>4. Ummbila<br>5. Iklabishi<br>6. Izaqathi<br>7. Ama-apula<br>8. Omunye (bhala igama lomkhiqizo)",
        askOtherProduce: "Bhala igama lomkhiqizo ofuna ukuwuhlolela inani:",
        priceResult: "INTENGO YOKUKHOMBISA — iyisibonelo kuphela, akuyona intengo yemakethe yamanje: {produce}: R{price} nge-{unit}.",
        priceNotAvailable: "Ayikho intengo yesibonelo ebekiwe ye-{produce}. Khetha omunye wemikhiqizo esohlwini ukuze ubone isibonelo.",
        weatherResult: "Isimo sezulu e-{location} singu-{temp}°C.<br><br>{agri}",
        error: "Ukukhetha okungavumelekile. Sicela uzame futhi.",
        notFound: "Uxolo, asikwazanga ukuthola idatha ye-'{location}'."
    },
    af: {
        greeting: "Hallo, welkom by Agri text.",
        askService: "Kies asseblief 'n opsie:<br>1. Weervoorspelling<br>2. Produkpryse",
        askWeatherPeriod: "Kies 'n voorspelling:<br>1. Daaglikse weer<br>2. Weeklikse weer",
        weatherRetry: "Ek kon nie die voorspelling vir {location} kry nie. Antwoord 1 om dieselfde versoek weer te probeer of 2 om 'n ander ligging in te voer.",
        dailyWeatherResult: "Daaglikse weer vir {location}: {condition}, hoog {high}°C en laag {low}°C. Reënkans: {rain}%.<br><br>{agri}",
        weeklyWeatherResult: "7-dae weervoorspelling vir {location}:<br>{days}<br><br>{season}",
        askMore: "Wil jy die kieslys sien en nog 'n versoek doen? Antwoord ja of nee.",
        yesNoError: "Antwoord asseblief ja of nee.",
        goodbye: "Dankie dat jy Agri text gebruik het. Druk herbegin wanneer jy weer wil begin.",
        askLocation: "Voer asseblief jou stad of SA poskode in (bv. 0700):",
        askProduce: "Vir watter produk wil jy die prys nagaan?<br>1. Tamaties<br>2. Aartappels<br>3. Uie<br>4. Mielies<br>5. Kool<br>6. Wortels<br>7. Appels<br>8. Ander (tik die produk se naam)",
        askOtherProduce: "Tik die naam van die produk waarvan jy die prys wil nagaan:",
        priceResult: "DEMO-PRYS — slegs 'n voorbeeld, nie 'n huidige markkwotasie nie: {produce}: R{price} per {unit}.",
        priceNotAvailable: "Daar is geen voorbeeldprys vir {produce} opgestel nie. Kies een van die produkte op die lys vir 'n voorbeeld.",
        weatherResult: "Die weer vir {location} is {temp}°C.<br><br>{agri}",
        error: "Ongeldige keuse. Probeer asseblief weer.",
        notFound: "Jammer, ons kon nie data vir '{location}' vind nie."
    },
    nso: {
        greeting: "Thobela, o amogetšwe go Agri text.",
        askService: "Ka kgopelo kgetha kgetho:<br>1. Ponelopele ya boso<br>2. Ditheko tša ditšweletšwa",
        askWeatherPeriod: "Kgetha ponelopele:<br>1. Boso bja letšatši le lengwe le le lengwe<br>2. Boso bja beke",
        weatherRetry: "Ga se ka kgona go hwetša ponelopele ya {location}. Araba 1 go leka kgopelo yeo gape goba 2 go tsenya lefelo le lengwe.",
        dailyWeatherResult: "Boso bja lehono go la {location}: {condition}, godimo {high}°C le fase {low}°C. Monyetla wa pula: {rain}%.<br><br>{agri}",
        weeklyWeatherResult: "Ponelopele ya matšatši a 7 go la {location}:<br>{days}<br><br>{season}",
        askMore: "Na o nyaka go bona lenaneo gomme wa dira kgopelo ye nngwe? Araba ee goba aowa.",
        yesNoError: "Ka kgopelo araba ee goba aowa.",
        goodbye: "Re a leboga ge o šomišitše Agri text. Kgotla go thoma leswa ge o nyaka go thoma gape.",
        askLocation: "Ka kgopelo tsenya toropo goba khoutu ya poso ya SA (mohlala 0700):",
        askProduce: "Ke setšweletšwa sefe seo o nyakago go se lekola theko ya sona?<br>1. Ditamati<br>2. Matapola<br>3. Eie<br>4. Mabele<br>5. Khabetšhe<br>6. Digwete<br>7. Diapola<br>8. Se sengwe (tlanya leina la setšweletšwa)",
        askOtherProduce: "Tlanya leina la setšweletšwa seo o nyakago go se lekola theko ya sona:",
        priceResult: "THEKO YA MOHLALA — ke mohlala fela, ga se theko ya bjale ya mmaraka: {produce}: R{price} ka {unit}.",
        priceNotAvailable: "Ga go na theko ya mohlala yeo e beetšwego {produce}. Kgetha setšweletšwa se sengwe lenaneong go bona mohlala.",
        weatherResult: "Boso bja {location} ke {temp}°C.<br><br>{agri}",
        error: "Kgetho e fošagetšego. Ka kgopelo leka gape.",
        notFound: "Re maswabi, ga re kgone go hwetša tshedimošo ya '{location}'."
    },
    ve: {
        greeting: "Ndaa, ni tanganedzwa kha Agri text.",
        askService: "Nangani tshumelo:<br>1. Mbulavhathu<br>2. Mitengo ya zwibveledzwa",
        askWeatherPeriod: "Nangani mbonalo ya mutsho:<br>1. Mutsho wa ḓuvha ḽiṅwe na ḽiṅwe<br>2. Mutsho wa vhege",
        weatherRetry: "A thi ngo kona u wana mutsho wa {location}. Fhindulani 1 u lingedze hafhu kana 2 u ṅwala fhethu huṅwe.",
        dailyWeatherResult: "Mutsho wa ṋamusi kha {location}: {condition}, nṱhesa {high}°C na fhasi {low}°C. Tshikhala tsha mvula: {rain}%.<br><br>{agri}",
        weeklyWeatherResult: "Mbonalo ya mutsho ya maḓuvha a 7 kha {location}:<br>{days}<br><br>{season}",
        askMore: "Ni khou ṱoḓa u vhona menyu na u ita khumbelo ntswa? Fhindulani ee kana hai.",
        yesNoError: "Fhindulani ee kana hai.",
        goodbye: "Ri a livhuwa nge na shumisa Agri text. Kilikani kha restart arali ni tshi ṱoḓa u thoma hafhu.",
        askLocation: "Ṅwalani ḓorobo kana khoudu ya poso ya Afurika Tshipembe (sa tsumbo 0700):",
        askProduce: "Ni ṱoḓa u vhona mutengo ufhio wa tshibveledzwa?<br>1. Matamatisi<br>2. Dziṱhu<br>3. Zwitungulo<br>4. Mahulu<br>5. Khavhishi<br>6. Kharotsi<br>7. Maapula<br>8. Zwiṅwe (ṅwalani dzina)",
        askOtherProduce: "Ṅwalani dzina ḽa tshibveledzwa:",
        priceResult: "MUTENGO WA TSHIFANYISO — ndi tsumbo fhedzi, a si mutengo wa vhukuma wa maraga: {produce}: R{price} nga {unit}.",
        priceNotAvailable: "A hu na mutengo wa tsumbo wa {produce}. Nangani tshibveledzwa tshi re kha mutevhe.",
        weatherResult: "Mutsho kha {location} ndi {temp}°C.<br><br>{agri}",
        error: "Khetho yo khakhea. Lingedzani hafhu.",
        notFound: "Ri khou humbela pfarelo, a ri ngo wana data ya '{location}'."
    },
    ts: {
        greeting: "Avuxeni, mi amukeriwile eka Agri text.",
        askService: "Hlawulani vukorhokeri:<br>1. Xiyimo xa maxelo<br>2. Mitengo ya swibyariwa",
        askWeatherPeriod: "Hlawulani mpimanyeto wa maxelo:<br>1. Maxelo ya siku na siku<br>2. Maxelo ya vhiki",
        weatherRetry: "A ndzi kumanga mpimanyeto wa maxelo wa {location}. Hlamulani 1 ku ringeta nakambe kumbe 2 ku nghenisa ndhawu yin'wana.",
        dailyWeatherResult: "Maxelo ya namuntlha e-{location}: {condition}, ku hisa ngopfu {high}°C na ku titimela {low}°C. Ndzingo wa mpfula: {rain}%.<br><br>{agri}",
        weeklyWeatherResult: "Mpimanyeto wa maxelo wa masiku ya 7 e-{location}:<br>{days}<br><br>{season}",
        askMore: "Xana mi lava ku vona menyu mi endla xikombelo xin'wana? Hlamulani ina kumbe e-e.",
        yesNoError: "Hlamulani ina kumbe e-e.",
        goodbye: "Ha khensa ku tirhisa Agri text. Cinekani restart loko mi lava ku sungula nakambe.",
        askLocation: "Nghenisani doroba kumbe khodi ya poso ya Afrika-Dzonga (xik. 0700):",
        askProduce: "Hi xihi xibyariwa lexi mi lavaka ku tiva nxavo wa xona?<br>1. Matamatisi<br>2. Timbatata<br>3. Anyanisi<br>4. Mavele<br>5. Khavichi<br>6. Tikharoti<br>7. Maapula<br>8. Xin'wana (tsala vito ra xona)",
        askOtherProduce: "Tsala vito ra xibyariwa lexi mi lavaka ku xi kambela:",
        priceResult: "NXAVO WA XIKOMBISO — i xikombiso ntsena, a hi nxavo wa sweswi wa makete: {produce}: R{price} hi {unit}.",
        priceNotAvailable: "A ku na nxavo wa xikombiso wa {produce}. Hlawulani xibyariwa lexi nga eka nxaxamelo.",
        weatherResult: "Maxelo e-{location} i {temp}°C.<br><br>{agri}",
        error: "Ku hlawula loku a ku tirhanga. Ringetani nakambe.",
        notFound: "Hi khomeleni, a hi kumanga vuxokoxoko bya '{location}'."
    }
};

const agriSuggestions = {
    en: {
        sunny: "🌱 Agri Suggestion: Soil may dry quickly; ensure crops are watered. Good time for harvesting.",
        cloudy: "🌱 Agri Suggestion: Low evaporation today makes it a great time to spray fertilizers or pesticides.",
        rain: "🌱 Agri Suggestion: Rain expected. Do not spray chemicals today. Great conditions for newly planted seeds.",
        storm: "🌱 Agri Suggestion: Thunderstorms expected. Delay field work and secure loose equipment.",
        default: "🌱 Agri Suggestion: Monitor crop and soil conditions closely today."
    },
    zu: {
        sunny: "🌱 Iseluleko: Inhlabathi ingoma ngokushesha; qiniseka ukuthi izitshalo zinamanzi.",
        cloudy: "🌱 Iseluleko: Isikhathi esihle sokufafaza umanyolo ngenxa yokuhwamuka okuphansi.",
        rain: "🌱 Iseluleko: Kulindeleke imvula. Ungafafazi amakhemikhali namuhla.",
        storm: "🌱 Iseluleko: Kulindeleke ukuduma kwezulu. Hlehlisa umsebenzi wasensimini.",
        default: "🌱 Iseluleko: Gada izimo zezitshalo zakho eduze namuhla."
    },
    af: {
        sunny: "🌱 Landbou Voorstel: Grond kan vinnig uitdroog; maak seker gewasse kry water.",
        cloudy: "🌱 Landbou Voorstel: Lae verdamping maak dit 'n goeie tyd om kunsmis te spuit.",
        rain: "🌱 Landbou Voorstel: Reën word verwag. Moenie vandag chemikalieë spuit nie.",
        storm: "🌱 Landbou Voorstel: Donderstorms word verwag. Stel veldwerk uit.",
        default: "🌱 Landbou Voorstel: Monitor gewastoestande fyn vandag."
    },
    nso: {
        sunny: "🌱 Tlhagiso ya Temo: Mabu a ka oma ka pela; netefatša gore dibjalo di nošetšwa.",
        cloudy: "🌱 Tlhagiso ya Temo: Ke nako e botse ya go fafatša manyora.",
        rain: "🌱 Tlhagiso ya Temo: Go letetšwe pula. Se fafatše dikhemikhale lehono.",
        storm: "🌱 Tlhagiso ya Temo: Go letetšwe matlakadibe a pula. Šutha mešomo ya tšhemo.",
        default: "🌱 Tlhagiso ya Temo: Lekola maemo a dibjalo tša gago ka kelohloko lehono."
    },
    ve: {
        sunny: "🌱 Nyeletshedzo ya vhulimi: Mavu a nga oma nga u ṱavhanya; ṱhogomelani uri zwimela zwi na maḓi.",
        cloudy: "🌱 Nyeletshedzo ya vhulimi: U fhisa huṱuku ha maḓi zwi ita uri ino ḓuvha ḽi vhe ḽavhuḓi kha u shela manyoro.",
        rain: "🌱 Nyeletshedzo ya vhulimi: Mvula i khou lavhelelwa. Ni songo shela mishonga.",
        storm: "🌱 Nyeletshedzo ya vhulimi: Maḓumbu a khou lavhelelwa. Imisani mushumo wa tsimuni.",
        default: "🌱 Nyeletshedzo ya vhulimi: Lavhelesani zwimela na mavu nga vhuronwane."
    },
    ts: {
        sunny: "🌱 Xitsundzuxo xa vurimi: Misava yi nga oma hi ku hatlisa; tiyisekisani leswaku swibyariwa swi kuma mati.",
        cloudy: "🌱 Xitsundzuxo xa vurimi: Ku hundzuka ka mati kutsongo swi endla leswaku ku va nkarhi lowunene wo chela manyoro.",
        rain: "🌱 Xitsundzuxo xa vurimi: Mpfula ya languteriwile. Mi nga cheli tikhemikhali.",
        storm: "🌱 Xitsundzuxo xa vurimi: Ku languteriwe xidzedze. Hlelisani mitirho ya le masin'wini.",
        default: "🌱 Xitsundzuxo xa vurimi: Langutisisani swibyariwa ni misava namuntlha."
    }
};

const seasonalSuggestions = {
    en: {
        summer: "☀️ Season (summer): Watch for heat stress and check soil moisture; water during cooler hours.",
        autumn: "🍂 Season (autumn): Check crop maturity and plan harvesting and soil preparation.",
        winter: "❄️ Season (winter): Protect frost-sensitive crops and check soil before irrigating.",
        spring: "🌼 Season (spring): Prepare planting beds and monitor young crops for weeds and pests."
    },
    zu: {
        summer: "☀️ Isikhathi sasehlobo: Qaphela ukushisa kwezitshalo nomswakama womhlabathi; nisela ngezikhathi ezipholile.",
        autumn: "🍂 Isikhathi sekwindla: Hlola ukuvuthwa kwezitshalo bese uhlela ukuvuna nokulungisa umhlabathi.",
        winter: "❄️ Isikhathi sasebusika: Vikela izitshalo ezingamelani nesithwathwa futhi uhlole umhlabathi ngaphambi kokunisela.",
        spring: "🌼 Isikhathi sentwasahlobo: Lungisa izindawo zokutshala futhi uqaphe ukhula nezinambuzane ezitshalweni ezintsha."
    },
    af: {
        summer: "☀️ Seisoen (somer): Wees op die uitkyk vir hittestres en kontroleer grondvog; besproei gedurende koeler ure.",
        autumn: "🍂 Seisoen (herfs): Kontroleer gewasmaturiteit en beplan die oes en grondvoorbereiding.",
        winter: "❄️ Seisoen (winter): Beskerm rypgevoelige gewasse en kontroleer die grond voor besproeiing.",
        spring: "🌼 Seisoen (lente): Berei plantbeddings voor en monitor jong gewasse vir onkruid en peste."
    },
    nso: {
        summer: "☀️ Sehla sa selemo: Hlokomela kgateletšego ya phišo le monola wa mmu; nošetša ka dinako tša go fodile.",
        autumn: "🍂 Sehla sa seruthwane: Lekola go butšwa ga dibjalo gomme o rulaganye puno le peakanyo ya mmu.",
        winter: "❄️ Sehla sa marega: Šireletša dibjalo tšeo di sa kgotlelelego tšhwaane gomme o hlahlobe mmu pele ga go nošetša.",
        spring: "🌼 Sehla sa seruthwana: Lokišetša mafelo a go bjala gomme o hlokomele mefoka le disenyi dibjalong tše nnyane."
    },
    ve: {
        summer: "☀️ Tshifhinga tsha tshilimo: Lavhelesani uri zwimela zwi si shishiwe nga mufhiso, nahone ni shele maḓi nga tshifhinga tshi rotholelaho.",
        autumn: "🍂 Nga tshifhinga tsha u wa ha maṱari: Sedzani u vhibva ha zwimela ni dzudzanye u kana.",
        winter: "❄️ Tshifhinga tsha vhuriha: Tsireledzani zwimela kha murotho nahone ni sedze mavu musi ni sa athu u shela maḓi.",
        spring: "🌼 Tshifhinga tsha tshimedzi: Lugisani fhethu ha u ṱavha nahone ni sedze zwimela zwiṱuku uri a zwi na tshene na zwikhokhonono."
    },
    ts: {
        summer: "☀️ Ximumu: Langutani ntshikilelo wa ku hisa ni kambela ndzhongho ya misava; chelelani hi tiawara to titimela.",
        autumn: "🍂 Hi nguva ya ku wa ka matluka: Kambelani ku vupfa ka swibyariwa mi tlhela mi kunguhata ntshovelo.",
        winter: "❄️ Xixika: Sirhelelani swibyariwa eka gwitsi mi kambela misava mi nga si cheleta.",
        spring: "🌼 Ximun'wana: Lunghisani tindhawu to byala mi tlhela mi langutela mfava ni switsotswana eka swibyariwa leswintshwa."
    }
};

const timeSuggestions = {
    en: {
        morning: "🕒 Timing: Early morning is a good time for irrigation and field work before the heat builds.",
        midday: "🕒 Timing: Avoid strenuous field work during the hottest hours and check crops for heat stress.",
        evening: "🕒 Timing: Cooler evening hours can be suitable for irrigation if crops need water.",
        night: "🕒 Timing: It is nighttime locally; plan irrigation and field work for daylight hours."
    },
    zu: {
        morning: "🕒 Isikhathi: Ekuseni kakhulu yisikhathi esihle sokunisela nokusebenza ensimini ngaphambi kokuba kushise.",
        midday: "🕒 Isikhathi: Gwema umsebenzi onzima ensimini ngezikhathi ezishisa kakhulu futhi uhlole izitshalo ukuthi azicindezelekile yini ngenxa yokushisa.",
        evening: "🕒 Isikhathi: Kusihlwa okupholile kungaba kuhle ukunisela uma izitshalo zidinga amanzi.",
        night: "🕒 Isikhathi: Kusebusuku endaweni yangakini; hlela ukunisela nomsebenzi wasensimini ngesikhathi sasemini."
    },
    af: {
        morning: "🕒 Tydsberekening: Vroegoggend is geskik vir besproeiing en veldwerk voordat dit warm word.",
        midday: "🕒 Tydsberekening: Vermy strawwe veldwerk gedurende die warmste ure en kyk vir hittestres by gewasse.",
        evening: "🕒 Tydsberekening: Koeler aandure kan geskik wees vir besproeiing indien gewasse water nodig het.",
        night: "🕒 Tydsberekening: Dit is plaaslik nag; beplan besproeiing en veldwerk vir dagligure."
    },
    nso: {
        morning: "🕒 Nako: Mesong ya ka pela ke nako ye botse ya go nošetša le go šoma tšhemong pele phišo e oketšega.",
        midday: "🕒 Nako: Phema mošomo o boima tšhemong ka dinako tša phišo ye kgolo gomme o lekole kgateletšego ya phišo dibjalong.",
        evening: "🕒 Nako: Mantšiboa a go fodilego a ka ba a maleba go nošetša ge dibjalo di nyaka meetse.",
        night: "🕒 Nako: Ke bošego lefelong la geno; rulaganya go nošetša le mošomo wa tšhemo nakong ya mosegare."
    },
    ve: {
        morning: "🕒 Tshifhinga: Matsheloni ndi tshifhinga tshavhuḓi tsha u shela maḓi na u shuma tsimuni hu sa athu u fhisa.",
        midday: "🕒 Tshifhinga: Ḽivhani mushumo u konḓaho nga awara dzi fhisaho nahone ni sedze uri zwimela a zwi khou shishiwa nga mufhiso.",
        evening: "🕒 Tshifhinga: Madekwana a rotholelaho a nga vha avhuḓi kha u shela maḓi arali zwimela zwi tshi a ṱoḓa.",
        night: "🕒 Tshifhinga: Ndi vhusiku fhethu ha haṋu; dzudzanyani u shela maḓi na mushumo wa tsimuni nga masiari."
    },
    ts: {
        morning: "🕒 Nkarhi: Nimixo i kahle ku cheleta ni tirha emasin'wini ku nga si hisa.",
        midday: "🕒 Nkarhi: Papalatani mitirho yo tika hi tiawara to hisa swinene mi kambela swibyariwa ku vona loko swi karhatiwa hi ku hisa.",
        evening: "🕒 Nkarhi: Madyambu yo titimela ma nga va nkarhi lowunene wo cheleta loko swibyariwa swi lava mati.",
        night: "🕒 Nkarhi: I vusiku laha mi nga kona; kunguhatani ku cheleta ni mitirho ya masimu hi nkarhi wa nhlikanhi."
    }
};

const produceByChoice = {
    en: ['Tomatoes', 'Potatoes', 'Onions', 'Maize', 'Cabbage', 'Carrots', 'Apples'],
    zu: ['Utamatisi', 'Amazambane', 'U-anyanisi', 'Ummbila', 'Iklabishi', 'Izaqathi', 'Ama-apula'],
    af: ['Tamaties', 'Aartappels', 'Uie', 'Mielies', 'Kool', 'Wortels', 'Appels'],
    nso: ['Ditamati', 'Matapola', 'Eie', 'Mabele', 'Khabetšhe', 'Digwete', 'Diapola'],
    ve: ['Matamatisi', 'Dziṱhu', 'Zwitungulo', 'Mahulu', 'Khavhishi', 'Kharotsi', 'Maapula'],
    ts: ['Matamatisi', 'Timbatata', 'Anyanisi', 'Mavele', 'Khavichi', 'Tikharoti', 'Maapula']
};
const demoProducePrices = [
    { price: 15, unit: 'kg' },
    { price: 8, unit: 'kg' },
    { price: 12, unit: 'kg' },
    { price: 5, unit: 'kg' },
    { price: 20, unit: 'head' },
    { price: 12, unit: 'kg' },
    { price: 18, unit: 'kg' }
];
const producePriceUnits = {
    en: { kg: 'kg', head: 'head' },
    zu: { kg: 'kg', head: 'ikhanda' },
    af: { kg: 'kg', head: 'kop' },
    nso: { kg: 'kg', head: 'hlogo' },
    ve: { kg: 'kg', head: 'ṱhoho' },
    ts: { kg: 'kg', head: 'nhloko' }
};

module.exports = {
    prompts,
    agriSuggestions,
    seasonalSuggestions,
    timeSuggestions,
    produceByChoice,
    demoProducePrices,
    producePriceUnits
};
