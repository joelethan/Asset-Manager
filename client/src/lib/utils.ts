import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAssessmentTypeLabel(type?: string): string {
  if (!type) return ''
  switch (type) {
    case 'END_OF_TERM':
      return 'EOT'
    case 'MIDTERM':
      return 'MOT'
    default:
      return type
  }
}
