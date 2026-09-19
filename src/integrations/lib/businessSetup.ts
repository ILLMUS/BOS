export interface NichePreset {
  key: string;
  label: string;
  roles: string[];
  workflow: string;
  steps: string[];
  /** Niche-specific placeholder examples used to guide form entry. */
  examples: {
    business: string;
    services: string;
    prefix: string;
    role: string;
    step: string;
  };
}

export const NICHE_PRESETS: NichePreset[] = [
  {
    key: "fabrication",
    label: "Manufacturing / Production",
    workflow: "Production Job Flow",
    roles: ["Sales", "Estimator", "Workshop Manager", "Installer", "Accounts"],
    steps: ["Lead Entry", "Site Assessment", "Costing", "Quotation", "Client Approval", "Production", "Installation", "Invoicing", "Closure"],
    examples: { business: "Bright Steel Works", services: "Gates, railings, carports", prefix: "BSW", role: "Workshop Manager", step: "Quality Check" },
  },
  {
    key: "construction",
    label: "Construction / Trades",
    workflow: "Project Flow",
    roles: ["Estimator", "Site Foreman", "Project Manager", "Accounts"],
    steps: ["Enquiry", "Site Inspection", "Quotation", "Client Approval", "Materials Order", "Execution", "Snag List", "Handover", "Invoicing"],
    examples: { business: "Summit Build Co.", services: "Renovations, paving, roofing", prefix: "SBC", role: "Site Foreman", step: "Snag List" },
  },
  {
    key: "services",
    label: "Professional Services / Agency",
    workflow: "Client Delivery Flow",
    roles: ["Account Manager", "Specialist", "Reviewer", "Billing"],
    steps: ["Enquiry", "Discovery Call", "Proposal", "Client Approval", "Delivery", "Review", "Invoicing", "Closure"],
    examples: { business: "Northline Consulting", services: "Strategy, design, retainers", prefix: "NLC", role: "Account Manager", step: "Client Review" },
  },
  {
    key: "health",
    label: "Clinic / Health Practice",
    workflow: "Patient Flow",
    roles: ["Receptionist", "Practitioner", "Billing"],
    steps: ["Booking", "Intake Form", "Consultation", "Treatment Plan", "Follow-up", "Billing"],
    examples: { business: "Willow Care Clinic", services: "Consultations, screenings, therapy", prefix: "WCC", role: "Practitioner", step: "Follow-up Call" },
  },
  {
    key: "hospitality",
    label: "Catering / Events / Hospitality",
    workflow: "Event Flow",
    roles: ["Coordinator", "Chef / Lead", "Logistics", "Accounts"],
    steps: ["Enquiry", "Menu / Brief", "Quotation", "Deposit", "Preparation", "Event Day", "Debrief", "Final Invoice"],
    examples: { business: "Amber Table Events", services: "Catering, venue hire, staffing", prefix: "ATE", role: "Event Coordinator", step: "Post-event Debrief" },
  },
  {
    key: "logistics",
    label: "Logistics / Transport",
    workflow: "Delivery Flow",
    roles: ["Dispatcher", "Driver", "Warehouse", "Accounts"],
    steps: ["Booking", "Load Planning", "Dispatch", "In Transit", "Proof of Delivery", "Invoicing"],
    examples: { business: "Swift Route Logistics", services: "Local delivery, freight, storage", prefix: "SRL", role: "Dispatcher", step: "Proof of Delivery" },
  },
  {
    key: "retail",
    label: "Retail / E-commerce",
    workflow: "Order Flow",
    roles: ["Sales", "Picker / Packer", "Dispatch", "Support"],
    steps: ["Order Received", "Payment Confirmed", "Picking", "Packing", "Shipping", "Delivered", "After-sales"],
    examples: { business: "Cove & Co. Store", services: "Online orders, in-store sales", prefix: "CCS", role: "Fulfilment Lead", step: "Packing Check" },
  },
  {
    key: "other",
    label: "Something else",
    workflow: "Main Workflow",
    roles: ["Team Member", "Manager"],
    steps: ["Enquiry", "Assessment", "Quotation", "Approval", "Delivery", "Invoicing"],
    examples: { business: "Your Business Name", services: "Your main products or services", prefix: "BIZ", role: "Team Member", step: "Quality Check" },
  },
];

export const EMPLOYEE_RANGES = ["Just me", "2-5", "6-20", "21-50", "51-200", "200+"];
