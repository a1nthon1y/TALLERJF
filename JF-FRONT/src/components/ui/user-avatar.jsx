"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function UserAvatar({ 
  user, 
  className,
  variant = "default"
}) {
  // Función para obtener las iniciales
  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '??'
  }

  // Diferentes estilos según el contexto
  const getVariantStyles = (variant) => {
    switch (variant) {
      case "sidebar":
        return "bg-sidebar-accent/50 text-sidebar-foreground"
      case "menu":
        return "bg-muted text-muted-foreground"
      case "activity":
        return "bg-primary/10 text-primary"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Avatar className={className}>
      <AvatarFallback className={cn(
        "text-sm font-medium",
        getVariantStyles(variant)
      )}>
        {getInitials(user?.name)}
      </AvatarFallback>
    </Avatar>
  )
} 