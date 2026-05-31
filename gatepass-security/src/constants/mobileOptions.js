export const SECURITY_UNITS = [
  "A101", "A102", "A103", "A104", "A105",
  "A106", "A107", "A108", "A109", "A110",
  "B201", "B202", "B203", "B204", "B205",
  "B206", "B207", "B208", "B209", "B210",
];

export const GATES = [
  "Main Gate",
  "Gate A",
  "Gate B",
  "Back Gate",
  "Service Gate",
];

export const VISITOR_CATEGORIES = [
  { value: "DELIVERY", label: "Delivery", icon: "📦" },
  { value: "GUEST", label: "Guest", icon: "👤" },
  { value: "DAILY_HELP", label: "Daily Help", icon: "🧹" },
  { value: "CAB", label: "Cab / Taxi", icon: "🚗" },
  { value: "SERVICE", label: "Service / Repair", icon: "🔧" },
  { value: "VENDOR", label: "Vendor", icon: "🏪" },
  { value: "MEDICAL", label: "Medical", icon: "🏥" },
  { value: "OTHER", label: "Other", icon: "📋" },
];

export const SECURITY_QUICK_MESSAGES = [
  "Please confirm if we should allow entry.",
  "Delivery is waiting at the gate.",
  "Your parcel has been marked delivered.",
  "Please collect from lobby within 10 minutes.",
  "Noted. Thank you.",
];

export const DELIVERY_PROFILES = [
  {
    id: "profile-bluedart",
    label: "BlueDart Rider",
    delivery_person_name: "Ravi Kumar",
    company: "BlueDart",
    phone_number: "9876543210",
    visitor_category: "DELIVERY",
  },
  {
    id: "profile-amazon",
    label: "Amazon Agent",
    delivery_person_name: "Aman Verma",
    company: "Amazon",
    phone_number: "9898989898",
    visitor_category: "DELIVERY",
  },
  {
    id: "profile-dhl",
    label: "DHL Courier",
    delivery_person_name: "Suresh N",
    company: "DHL",
    phone_number: "9988776655",
    visitor_category: "DELIVERY",
  },
];
