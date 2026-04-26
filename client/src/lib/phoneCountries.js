/**
 * Country calling codes for searchable picker. Labels shown in UI; `dial` is digits only (no +).
 * Uniqued by dial; longest codes first for prefix splitting.
 */
const RAW = [
  ['1242', 'Bahamas'], ['1246', 'Barbados'], ['1264', 'Anguilla'], ['1268', 'Antigua & Barbuda'],
  ['1284', 'British Virgin Islands'], ['1340', 'US Virgin Islands'], ['1345', 'Cayman Islands'],
  ['1441', 'Bermuda'], ['1473', 'Grenada'], ['1649', 'Turks & Caicos'], ['1664', 'Montserrat'],
  ['1671', 'Guam'], ['1684', 'American Samoa'], ['1721', 'Sint Maarten'], ['1758', 'Saint Lucia'],
  ['1767', 'Dominica'], ['1784', 'Saint Vincent'], ['1787', 'Puerto Rico'], ['1809', 'Dominican Rep.'],
  ['1829', 'Dominican Rep.'], ['1849', 'Dominican Rep.'], ['1868', 'Trinidad & Tobago'],
  ['1869', 'Saint Kitts & Nevis'], ['1876', 'Jamaica'],
  ['970', 'Palestine'], ['971', 'UAE'], ['972', 'Israel'], ['973', 'Bahrain'], ['974', 'Qatar'],
  ['975', 'Bhutan'], ['976', 'Mongolia'], ['977', 'Nepal'],
  ['992', 'Tajikistan'], ['993', 'Turkmenistan'], ['994', 'Azerbaijan'], ['995', 'Georgia'],
  ['996', 'Kyrgyzstan'], ['998', 'Uzbekistan'],
  ['880', 'Bangladesh'], ['886', 'Taiwan'],
  ['960', 'Maldives'], ['961', 'Lebanon'], ['962', 'Jordan'], ['963', 'Syria'], ['964', 'Iraq'],
  ['965', 'Kuwait'], ['966', 'Saudi Arabia'], ['967', 'Yemen'], ['968', 'Oman'],
  ['852', 'Hong Kong'], ['853', 'Macau'], ['855', 'Cambodia'], ['856', 'Laos'],
  ['673', 'Brunei'], ['675', 'Papua New Guinea'], ['679', 'Fiji'],
  ['501', 'Belize'], ['502', 'Guatemala'], ['503', 'El Salvador'], ['504', 'Honduras'],
  ['505', 'Nicaragua'], ['506', 'Costa Rica'], ['507', 'Panama'], ['509', 'Haiti'],
  ['591', 'Bolivia'], ['592', 'Guyana'], ['593', 'Ecuador'], ['595', 'Paraguay'],
  ['597', 'Suriname'], ['598', 'Uruguay'],
  ['351', 'Portugal'], ['352', 'Luxembourg'], ['353', 'Ireland'], ['354', 'Iceland'],
  ['355', 'Albania'], ['356', 'Malta'], ['357', 'Cyprus'], ['358', 'Finland'], ['359', 'Bulgaria'],
  ['370', 'Lithuania'], ['371', 'Latvia'], ['372', 'Estonia'], ['373', 'Moldova'], ['374', 'Armenia'],
  ['375', 'Belarus'], ['376', 'Andorra'], ['377', 'Monaco'], ['380', 'Ukraine'], ['381', 'Serbia'],
  ['382', 'Montenegro'], ['385', 'Croatia'], ['386', 'Slovenia'], ['387', 'Bosnia'],
  ['389', 'North Macedonia'], ['420', 'Czechia'], ['421', 'Slovakia'], ['423', 'Liechtenstein'],
  ['212', 'Morocco'], ['213', 'Algeria'], ['216', 'Tunisia'], ['218', 'Libya'],
  ['220', 'Gambia'], ['221', 'Senegal'], ['223', 'Mali'], ['224', 'Guinea'], ['225', 'Ivory Coast'],
  ['226', 'Burkina Faso'], ['227', 'Niger'], ['228', 'Togo'], ['229', 'Benin'], ['230', 'Mauritius'],
  ['231', 'Liberia'], ['232', 'Sierra Leone'], ['233', 'Ghana'], ['234', 'Nigeria'], ['235', 'Chad'],
  ['236', 'Central African Rep.'], ['237', 'Cameroon'], ['238', 'Cape Verde'], ['240', 'Gabon'],
  ['241', 'Congo'], ['242', 'DR Congo'], ['243', 'DR Congo'], ['244', 'Angola'], ['245', 'Guinea-Bissau'],
  ['246', 'British Indian Ocean'], ['248', 'Seychelles'], ['249', 'Sudan'], ['250', 'Rwanda'],
  ['251', 'Ethiopia'], ['252', 'Somalia'], ['253', 'Djibouti'], ['254', 'Kenya'], ['255', 'Tanzania'],
  ['256', 'Uganda'], ['257', 'Burundi'], ['258', 'Mozambique'], ['260', 'Zambia'], ['261', 'Madagascar'],
  ['262', 'Réunion / Mayotte'], ['263', 'Zimbabwe'], ['264', 'Namibia'], ['265', 'Malawi'],
  ['266', 'Lesotho'], ['267', 'Botswana'], ['268', 'Eswatini'], ['269', 'Comoros'],
  ['27', 'South Africa'],
  ['290', 'Saint Helena'], ['297', 'Aruba'], ['298', 'Faroe Islands'], ['299', 'Greenland'],
  ['30', 'Greece'], ['31', 'Netherlands'], ['32', 'Belgium'], ['33', 'France'], ['34', 'Spain'],
  ['36', 'Hungary'], ['39', 'Italy'], ['40', 'Romania'], ['41', 'Switzerland'], ['43', 'Austria'],
  ['44', 'United Kingdom'], ['45', 'Denmark'], ['46', 'Sweden'], ['47', 'Norway'], ['48', 'Poland'],
  ['49', 'Germany'],
  ['51', 'Peru'], ['52', 'Mexico'], ['53', 'Cuba'], ['54', 'Argentina'], ['55', 'Brazil'],
  ['56', 'Chile'], ['57', 'Colombia'], ['58', 'Venezuela'],
  ['60', 'Malaysia'], ['61', 'Australia'], ['62', 'Indonesia'], ['63', 'Philippines'],
  ['64', 'New Zealand'], ['65', 'Singapore'], ['66', 'Thailand'],
  ['81', 'Japan'], ['82', 'South Korea'], ['84', 'Vietnam'], ['86', 'China'],
  ['90', 'Turkey'], ['91', 'India'], ['92', 'Pakistan'], ['93', 'Afghanistan'], ['94', 'Sri Lanka'],
  ['95', 'Myanmar'], ['98', 'Iran'],
  ['7', 'Russia / Kazakhstan'],
  ['1', 'United States / Canada'],
];

const seen = new Set();
export const COUNTRY_DIAL_CODES = [];
for (const [dial, name] of RAW) {
  const key = `${dial}|${name}`;
  if (seen.has(key)) continue;
  seen.add(key);
  COUNTRY_DIAL_CODES.push({ dial, name });
}

export const DIAL_SORTED_LONGEST_FIRST = [...new Set(COUNTRY_DIAL_CODES.map((c) => c.dial))].sort(
  (a, b) => b.length - a.length
);

export const DEFAULT_DIAL = '977';
