"use client"

import { CldUploadWidget, type CldUploadWidgetProps } from "next-cloudinary"

// ponytail: theming via options.styles.palette — Cloudinary's documented API
// border-radius tidak bisa di-override via options (widget renders in iframe)
const EDITORIAL_OPTIONS: NonNullable<CldUploadWidgetProps["options"]> = {
  theme: "minimal",
  clientAllowedFormats: ["png", "jpg", "jpeg", "webp"],
  maxImageFileSize: 5000000, // 5MB
  styles: {
    palette: {
      window: "#FAFAFA",
      windowBorder: "#E4E4E7",
      tabIcon: "#DC2626",
      menuIcons: "#09090B",
      textDark: "#09090B",
      textLight: "#FFFFFF",
      link: "#DC2626",
      action: "#DC2626",
      inactiveTabIcon: "#6B7280",
      error: "#DC2626",
      inProgress: "#DC2626",
      complete: "#22C55E",
      sourceBg: "#FFFFFF",
    },
    fonts: {
      default: null,
      "'Roboto', sans-serif": {
        url: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
        active: true,
      },
    },
  },
}

export function UploadWidget({ options, ...props }: CldUploadWidgetProps) {
  return (
    <CldUploadWidget
      options={{ ...EDITORIAL_OPTIONS, ...options }}
      {...props}
    />
  )
}
