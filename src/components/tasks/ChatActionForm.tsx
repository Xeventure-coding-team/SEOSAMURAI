import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

interface SocialLinks {
  [key: string]: string;
}

interface QnAItem {
  question: string;
  answer: string;
}

interface PostData {
  title: string;
  description: string;
  image_url: string;
  file?: File | null;
  topicType?: string;
  actionButton?: string;
  actionLink?: string;
  callPhone?: string;
}

interface FormDataType {
  description: string;
  files: File[];
  phone: string;
  website: string;
  services: string;
  reviewsReply: string;
  video: File[];
  businessHours: BusinessHours;
  socialLinks: SocialLinks;
  attributes: string;
  qna: QnAItem[];
  post: PostData;
  chatType: "whatsapp" | "sms" | "";
  chatValue: string;
  countryCode?: string;
  phoneNumber?: string;
}

interface ChatActionFormProps {
  formData: FormDataType;
  setFormData: (data: FormDataType) => void;
}

export const ChatActionForm: React.FC<ChatActionFormProps> = ({
  formData,
  setFormData,
}) => {
  const handleWhatsAppChange = (value: string) => {
    const prefix = "https://wa.me/";
    const formattedValue = value.startsWith(prefix)
      ? value
      : prefix + value.replace(prefix, "").replace(/\s+/g, "");
    setFormData({ ...formData, chatValue: formattedValue });
  };

  return (
    <div className="space-y-5 rounded-xl border p-5 shadow-sm bg-card">
      <div className="space-y-2">
        <Label>Select Chat Type</Label>
        <Select
          value={formData.chatType}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              chatType: value as "whatsapp" | "sms",
              chatValue: "",
              countryCode: "",
              phoneNumber: "",
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select chat type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS / Text Message</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.chatType === "whatsapp" && (
        <div className="space-y-2">
          <Label>WhatsApp Link</Label>
          <Input
            type="text"
            value={formData.chatValue || "https://wa.me/"}
            onChange={(e) => handleWhatsAppChange(e.target.value)}
            placeholder="https://wa.me/15551234567"
          />
          <p className="text-sm text-muted-foreground">
            Example: <code>https://wa.me/15551234567</code>
          </p>
        </div>
      )}

      {formData.chatType === "sms" && (
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              className="w-24"
              placeholder="+91"
              value={formData.countryCode || ""}
              onChange={(e) =>
                setFormData({ ...formData, countryCode: e.target.value })
              }
            />
            <Input
              type="text"
              className="flex-1"
              placeholder="9876543210"
              value={formData.phoneNumber || ""}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Example: +1 5551234567
          </p>
        </div>
      )}
    </div>
  );
};
