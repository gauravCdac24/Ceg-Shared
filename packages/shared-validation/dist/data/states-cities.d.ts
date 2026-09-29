/**
 * Indian states + union territories with their major cities.
 *
 * Curated from the data.gov.in "All India Pincode Directory" plus the
 * 2011 Census class-1/2 urban-agglomeration list. Covers ~700 cities — enough
 * for most public-facing forms. For exhaustive coverage, fall back to the
 * `lookupPincode` network call.
 *
 * Last reviewed: 2026-05-12.
 *
 * Schema: `Record<StateName, readonly CityName[]>`. Cities are sorted A→Z.
 */
export declare const STATES_AND_CITIES: {
    readonly "Andhra Pradesh": readonly ["Anantapur", "Bhimavaram", "Chittoor", "Eluru", "Guntur", "Kadapa", "Kakinada", "Kurnool", "Nellore", "Ongole", "Rajahmundry", "Srikakulam", "Tirupati", "Vijayawada", "Visakhapatnam", "Vizianagaram", "Warangal"];
    readonly "Arunachal Pradesh": readonly ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro"];
    readonly Assam: readonly ["Barpeta", "Bongaigaon", "Dhubri", "Dibrugarh", "Dispur", "Guwahati", "Jorhat", "Karimganj", "Nagaon", "North Lakhimpur", "Silchar", "Tezpur", "Tinsukia"];
    readonly Bihar: readonly ["Ara", "Begusarai", "Bhagalpur", "Bihar Sharif", "Buxar", "Chhapra", "Darbhanga", "Gaya", "Hajipur", "Katihar", "Munger", "Muzaffarpur", "Patna", "Purnia", "Saharsa", "Sasaram", "Sitamarhi"];
    readonly Chhattisgarh: readonly ["Ambikapur", "Bhilai", "Bilaspur", "Durg", "Jagdalpur", "Korba", "Raigarh", "Raipur", "Rajnandgaon"];
    readonly Goa: readonly ["Margao", "Mapusa", "Panaji", "Ponda", "Vasco da Gama"];
    readonly Gujarat: readonly ["Ahmedabad", "Amreli", "Anand", "Bharuch", "Bhavnagar", "Bhuj", "Gandhinagar", "Godhra", "Jamnagar", "Junagadh", "Mehsana", "Morbi", "Nadiad", "Navsari", "Patan", "Porbandar", "Rajkot", "Surat", "Surendranagar", "Vadodara", "Valsad", "Vapi", "Veraval"];
    readonly Haryana: readonly ["Ambala", "Bhiwani", "Faridabad", "Fatehabad", "Gurgaon", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"];
    readonly "Himachal Pradesh": readonly ["Bilaspur", "Chamba", "Dharamshala", "Hamirpur", "Kullu", "Mandi", "Nahan", "Shimla", "Solan", "Una"];
    readonly Jharkhand: readonly ["Bokaro Steel City", "Chaibasa", "Deoghar", "Dhanbad", "Dumka", "Giridih", "Hazaribagh", "Jamshedpur", "Phusro", "Ramgarh", "Ranchi"];
    readonly Karnataka: readonly ["Ballari", "Belagavi", "Bengaluru", "Bidar", "Chikkamagaluru", "Chitradurga", "Davangere", "Dharwad", "Gadag-Betageri", "Hassan", "Hubballi", "Kalaburagi", "Kolar", "Mandya", "Mangaluru", "Mysuru", "Raichur", "Shivamogga", "Tumakuru", "Udupi", "Vijayapura"];
    readonly Kerala: readonly ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kochi", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"];
    readonly "Madhya Pradesh": readonly ["Bhopal", "Burhanpur", "Chhindwara", "Dewas", "Dhar", "Gwalior", "Indore", "Jabalpur", "Khandwa", "Khargone", "Mandsaur", "Morena", "Murwara", "Neemuch", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Shivpuri", "Singrauli", "Ujjain", "Vidisha"];
    readonly Maharashtra: readonly ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Bhusawal", "Chandrapur", "Dhule", "Hingoli", "Ichalkaranji", "Jalgaon", "Jalna", "Kalyan-Dombivali", "Kolhapur", "Latur", "Mira-Bhayandar", "Mumbai", "Nagpur", "Nanded", "Nashik", "Navi Mumbai", "Osmanabad", "Parbhani", "Pimpri-Chinchwad", "Pune", "Ratnagiri", "Sangli", "Satara", "Solapur", "Thane", "Vasai-Virar", "Wardha", "Washim", "Yavatmal"];
    readonly Manipur: readonly ["Bishnupur", "Churachandpur", "Imphal", "Kakching", "Thoubal"];
    readonly Meghalaya: readonly ["Jowai", "Nongstoin", "Shillong", "Tura", "Williamnagar"];
    readonly Mizoram: readonly ["Aizawl", "Champhai", "Lunglei", "Saiha", "Serchhip"];
    readonly Nagaland: readonly ["Dimapur", "Kohima", "Mokokchung", "Tuensang", "Wokha"];
    readonly Odisha: readonly ["Balasore", "Berhampur", "Bhadrak", "Bhubaneswar", "Cuttack", "Jharsuguda", "Puri", "Rourkela", "Sambalpur"];
    readonly Punjab: readonly ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Malerkotla", "Mansa", "Moga", "Mohali", "Muktsar", "Nawanshahr", "Pathankot", "Patiala", "Rupnagar", "Sangrur", "Tarn Taran"];
    readonly Rajasthan: readonly ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Beawar", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kishangarh", "Kota", "Nagaur", "Pali", "Pratapgarh", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"];
    readonly Sikkim: readonly ["Gangtok", "Geyzing", "Mangan", "Namchi"];
    readonly "Tamil Nadu": readonly ["Chennai", "Coimbatore", "Cuddalore", "Dindigul", "Erode", "Hosur", "Karaikudi", "Karur", "Kanchipuram", "Kanyakumari", "Kumbakonam", "Madurai", "Nagapattinam", "Nagercoil", "Namakkal", "Neyveli", "Ooty", "Pollachi", "Pudukkottai", "Rajapalayam", "Ramanathapuram", "Salem", "Sivagangai", "Sivakasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"];
    readonly Telangana: readonly ["Adilabad", "Hyderabad", "Karimnagar", "Khammam", "Mahbubnagar", "Nalgonda", "Nizamabad", "Ramagundam", "Secunderabad", "Suryapet", "Warangal"];
    readonly Tripura: readonly ["Agartala", "Ambassa", "Dharmanagar", "Kailasahar", "Udaipur"];
    readonly "Uttar Pradesh": readonly ["Agra", "Aligarh", "Allahabad", "Amroha", "Auraiya", "Azamgarh", "Bahraich", "Ballia", "Banda", "Barabanki", "Bareilly", "Basti", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Deoria", "Etah", "Etawah", "Faizabad", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hapur", "Hardoi", "Hathras", "Jaunpur", "Jhansi", "Kannauj", "Kanpur", "Kasganj", "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Maharajganj", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Noida", "Pilibhit", "Pratapgarh", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"];
    readonly Uttarakhand: readonly ["Almora", "Bageshwar", "Dehradun", "Haldwani", "Haridwar", "Kashipur", "Nainital", "Pithoragarh", "Roorkee", "Rudrapur", "Tehri", "Udhamsingh Nagar"];
    readonly "West Bengal": readonly ["Alipurduar", "Asansol", "Bankura", "Bardhaman", "Birbhum", "Cooch Behar", "Darjeeling", "Durgapur", "Hooghly", "Howrah", "Jalpaiguri", "Kalyani", "Kharagpur", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Medinipur", "Purba Medinipur", "Purulia", "Siliguri", "South 24 Parganas"];
    readonly Delhi: readonly ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"];
    readonly "Jammu and Kashmir": readonly ["Anantnag", "Baramulla", "Budgam", "Doda", "Jammu", "Kathua", "Kupwara", "Pulwama", "Rajouri", "Srinagar", "Udhampur"];
    readonly Ladakh: readonly ["Kargil", "Leh"];
    readonly Chandigarh: readonly ["Chandigarh"];
    readonly Puducherry: readonly ["Karaikal", "Mahe", "Puducherry", "Yanam"];
    readonly "Andaman and Nicobar Islands": readonly ["Diglipur", "Port Blair"];
    readonly "Dadra and Nagar Haveli and Daman and Diu": readonly ["Daman", "Diu", "Silvassa"];
    readonly Lakshadweep: readonly ["Amini", "Kavaratti", "Minicoy"];
};
export type StateName = keyof typeof STATES_AND_CITIES;
export declare const STATE_NAMES: readonly StateName[];
export declare function citiesForState(state: string): readonly string[];
/** Best-effort case-insensitive resolver. Returns the canonical name. */
export declare function resolveStateName(raw: string): StateName | null;
//# sourceMappingURL=states-cities.d.ts.map