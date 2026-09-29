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
export const STATES_AND_CITIES = {
    "Andhra Pradesh": [
        "Anantapur", "Bhimavaram", "Chittoor", "Eluru", "Guntur", "Kadapa",
        "Kakinada", "Kurnool", "Nellore", "Ongole", "Rajahmundry", "Srikakulam",
        "Tirupati", "Vijayawada", "Visakhapatnam", "Vizianagaram", "Warangal",
    ],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro"],
    "Assam": [
        "Barpeta", "Bongaigaon", "Dhubri", "Dibrugarh", "Dispur", "Guwahati",
        "Jorhat", "Karimganj", "Nagaon", "North Lakhimpur", "Silchar", "Tezpur", "Tinsukia",
    ],
    "Bihar": [
        "Ara", "Begusarai", "Bhagalpur", "Bihar Sharif", "Buxar", "Chhapra",
        "Darbhanga", "Gaya", "Hajipur", "Katihar", "Munger", "Muzaffarpur",
        "Patna", "Purnia", "Saharsa", "Sasaram", "Sitamarhi",
    ],
    "Chhattisgarh": [
        "Ambikapur", "Bhilai", "Bilaspur", "Durg", "Jagdalpur", "Korba",
        "Raigarh", "Raipur", "Rajnandgaon",
    ],
    "Goa": ["Margao", "Mapusa", "Panaji", "Ponda", "Vasco da Gama"],
    "Gujarat": [
        "Ahmedabad", "Amreli", "Anand", "Bharuch", "Bhavnagar", "Bhuj",
        "Gandhinagar", "Godhra", "Jamnagar", "Junagadh", "Mehsana", "Morbi",
        "Nadiad", "Navsari", "Patan", "Porbandar", "Rajkot", "Surat", "Surendranagar",
        "Vadodara", "Valsad", "Vapi", "Veraval",
    ],
    "Haryana": [
        "Ambala", "Bhiwani", "Faridabad", "Fatehabad", "Gurgaon", "Hisar",
        "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh",
        "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar",
    ],
    "Himachal Pradesh": [
        "Bilaspur", "Chamba", "Dharamshala", "Hamirpur", "Kullu", "Mandi",
        "Nahan", "Shimla", "Solan", "Una",
    ],
    "Jharkhand": [
        "Bokaro Steel City", "Chaibasa", "Deoghar", "Dhanbad", "Dumka", "Giridih",
        "Hazaribagh", "Jamshedpur", "Phusro", "Ramgarh", "Ranchi",
    ],
    "Karnataka": [
        "Ballari", "Belagavi", "Bengaluru", "Bidar", "Chikkamagaluru", "Chitradurga",
        "Davangere", "Dharwad", "Gadag-Betageri", "Hassan", "Hubballi", "Kalaburagi",
        "Kolar", "Mandya", "Mangaluru", "Mysuru", "Raichur", "Shivamogga", "Tumakuru",
        "Udupi", "Vijayapura",
    ],
    "Kerala": [
        "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kochi",
        "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta",
        "Thiruvananthapuram", "Thrissur", "Wayanad",
    ],
    "Madhya Pradesh": [
        "Bhopal", "Burhanpur", "Chhindwara", "Dewas", "Dhar", "Gwalior",
        "Indore", "Jabalpur", "Khandwa", "Khargone", "Mandsaur", "Morena",
        "Murwara", "Neemuch", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore",
        "Shivpuri", "Singrauli", "Ujjain", "Vidisha",
    ],
    "Maharashtra": [
        "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara",
        "Bhusawal", "Chandrapur", "Dhule", "Hingoli", "Ichalkaranji", "Jalgaon",
        "Jalna", "Kalyan-Dombivali", "Kolhapur", "Latur", "Mira-Bhayandar",
        "Mumbai", "Nagpur", "Nanded", "Nashik", "Navi Mumbai", "Osmanabad",
        "Parbhani", "Pimpri-Chinchwad", "Pune", "Ratnagiri", "Sangli", "Satara",
        "Solapur", "Thane", "Vasai-Virar", "Wardha", "Washim", "Yavatmal",
    ],
    "Manipur": ["Bishnupur", "Churachandpur", "Imphal", "Kakching", "Thoubal"],
    "Meghalaya": ["Jowai", "Nongstoin", "Shillong", "Tura", "Williamnagar"],
    "Mizoram": ["Aizawl", "Champhai", "Lunglei", "Saiha", "Serchhip"],
    "Nagaland": ["Dimapur", "Kohima", "Mokokchung", "Tuensang", "Wokha"],
    "Odisha": [
        "Balasore", "Berhampur", "Bhadrak", "Bhubaneswar", "Cuttack", "Jharsuguda",
        "Puri", "Rourkela", "Sambalpur",
    ],
    "Punjab": [
        "Amritsar", "Barnala", "Bathinda", "Faridkot", "Fazilka", "Ferozepur",
        "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana",
        "Malerkotla", "Mansa", "Moga", "Mohali", "Muktsar", "Nawanshahr",
        "Pathankot", "Patiala", "Rupnagar", "Sangrur", "Tarn Taran",
    ],
    "Rajasthan": [
        "Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Beawar", "Bharatpur",
        "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa",
        "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore",
        "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kishangarh", "Kota",
        "Nagaur", "Pali", "Pratapgarh", "Sawai Madhopur", "Sikar", "Sirohi",
        "Sri Ganganagar", "Tonk", "Udaipur",
    ],
    "Sikkim": ["Gangtok", "Geyzing", "Mangan", "Namchi"],
    "Tamil Nadu": [
        "Chennai", "Coimbatore", "Cuddalore", "Dindigul", "Erode", "Hosur",
        "Karaikudi", "Karur", "Kanchipuram", "Kanyakumari", "Kumbakonam",
        "Madurai", "Nagapattinam", "Nagercoil", "Namakkal", "Neyveli", "Ooty",
        "Pollachi", "Pudukkottai", "Rajapalayam", "Ramanathapuram", "Salem",
        "Sivagangai", "Sivakasi", "Thanjavur", "Theni", "Thoothukudi",
        "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur",
        "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar",
    ],
    "Telangana": [
        "Adilabad", "Hyderabad", "Karimnagar", "Khammam", "Mahbubnagar",
        "Nalgonda", "Nizamabad", "Ramagundam", "Secunderabad", "Suryapet",
        "Warangal",
    ],
    "Tripura": ["Agartala", "Ambassa", "Dharmanagar", "Kailasahar", "Udaipur"],
    "Uttar Pradesh": [
        "Agra", "Aligarh", "Allahabad", "Amroha", "Auraiya", "Azamgarh",
        "Bahraich", "Ballia", "Banda", "Barabanki", "Bareilly", "Basti",
        "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Deoria", "Etah",
        "Etawah", "Faizabad", "Farrukhabad", "Fatehpur", "Firozabad",
        "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur",
        "Hapur", "Hardoi", "Hathras", "Jaunpur", "Jhansi", "Kannauj", "Kanpur",
        "Kasganj", "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Maharajganj",
        "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad",
        "Muzaffarnagar", "Noida", "Pilibhit", "Pratapgarh", "Raebareli",
        "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur",
        "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra",
        "Sultanpur", "Unnao", "Varanasi",
    ],
    "Uttarakhand": [
        "Almora", "Bageshwar", "Dehradun", "Haldwani", "Haridwar", "Kashipur",
        "Nainital", "Pithoragarh", "Roorkee", "Rudrapur", "Tehri", "Udhamsingh Nagar",
    ],
    "West Bengal": [
        "Alipurduar", "Asansol", "Bankura", "Bardhaman", "Birbhum", "Cooch Behar",
        "Darjeeling", "Durgapur", "Hooghly", "Howrah", "Jalpaiguri", "Kalyani",
        "Kharagpur", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas",
        "Paschim Medinipur", "Purba Medinipur", "Purulia", "Siliguri",
        "South 24 Parganas",
    ],
    "Delhi": [
        "Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi",
        "North West Delhi", "Shahdara", "South Delhi", "South East Delhi",
        "South West Delhi", "West Delhi",
    ],
    "Jammu and Kashmir": [
        "Anantnag", "Baramulla", "Budgam", "Doda", "Jammu", "Kathua",
        "Kupwara", "Pulwama", "Rajouri", "Srinagar", "Udhampur",
    ],
    "Ladakh": ["Kargil", "Leh"],
    "Chandigarh": ["Chandigarh"],
    "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"],
    "Andaman and Nicobar Islands": ["Diglipur", "Port Blair"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
    "Lakshadweep": ["Amini", "Kavaratti", "Minicoy"],
};
export const STATE_NAMES = Object.keys(STATES_AND_CITIES).sort();
export function citiesForState(state) {
    return STATES_AND_CITIES[state] ?? [];
}
/** Best-effort case-insensitive resolver. Returns the canonical name. */
export function resolveStateName(raw) {
    const norm = raw.trim().toLowerCase();
    for (const name of STATE_NAMES) {
        if (name.toLowerCase() === norm)
            return name;
    }
    return null;
}
//# sourceMappingURL=states-cities.js.map