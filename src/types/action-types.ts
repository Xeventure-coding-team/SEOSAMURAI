export interface ActionTypeConfig {
  id: string
  label: string
  icon: string
  description: string
  validation?: (value: any) => string | null
}

export const ACTION_TYPES: Record<string, ActionTypeConfig> = {
  photo: {
    id: "photo",
    label: "Upload Photos",
    icon: "Upload",
    description: "Max 20 photos, 10MB each (JPG, PNG, WebP)",
  },
  video: {
    id: "video",
    label: "Upload Video",
    icon: "Video",
    description: "MP4, WebM, or OGG format (max 40MB)",
  },
  description: {
    id: "description",
    label: "Edit Description",
    icon: "Edit",
    description: "10–750 characters",
  },
  phone: {
    id: "phone",
    label: "Update Phone",
    icon: "Phone",
    description: "Business phone number",
  },
  website: {
    id: "website",
    label: "Update Website",
    icon: "Globe",
    description: "Business website URL",
  },
  services: {
    id: "services",
    label: "Add Services",
    icon: "Briefcase",
    description: "List your services",
  },
  hours: {
    id: "hours",
    label: "Set Hours",
    icon: "Clock",
    description: "Business operating hours",
  },
  reviews_reply: {
    id: "reviews_reply",
    label: "Reply to Review",
    icon: "MessageSquare",
    description: "Respond to customer reviews",
  },
  links: {
    id: "links",
    label: "Add Links",
    icon: "Link2",
    description: "Social media profiles",
  },
  attributes: {
    id: "attributes",
    label: "Add Attributes",
    icon: "FileText",
    description: "Business attributes and features",
  },
  qna: {
    id: "qna",
    label: "Add Q&A",
    icon: "HelpCircle",
    description: "Frequently asked questions",
  },
  post: {
    id: "post",
    label: "Create Post",
    icon: "Plus",
    description: "Create a new business post",
  },
  appointment: {
    id: "appointment",
    label: "Add Appointment Link",
    icon: "Calendar",
    description: "Add your booking or appointment link for customers to schedule visits",
  },
  chat: {
    id: "chat",
    label: "Add Chat Option",
    icon: "MessageSquare",
    description:
      "Enable instant chat via WhatsApp or SMS for customer communication",
  },
}
