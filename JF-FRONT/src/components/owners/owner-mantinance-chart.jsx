"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

// Datos de ejemplo para gráficos por dueño
const ownerChartData = {
  1: [
    {
      name: "Ene",
      preventivo: 4,
      correctivo: 2,
    },
    {
      name: "Feb",
      preventivo: 6,
      correctivo: 3,
    },
    {
      name: "Mar",
      preventivo: 5,
      correctivo: 2,
    },
    {
      name: "Abr",
      preventivo: 7,
      correctivo: 1,
    },
    {
      name: "May",
      preventivo: 8,
      correctivo: 3,
    },
    {
      name: "Jun",
      preventivo: 6,
      correctivo: 2,
    },
  ],
  2: [
    {
      name: "Ene",
      preventivo: 6,
      correctivo: 3,
    },
    {
      name: "Feb",
      preventivo: 8,
      correctivo: 4,
    },
    {
      name: "Mar",
      preventivo: 7,
      correctivo: 5,
    },
    {
      name: "Abr",
      preventivo: 9,
      correctivo: 2,
    },
    {
      name: "May",
      preventivo: 10,
      correctivo: 4,
    },
    {
      name: "Jun",
      preventivo: 8,
      correctivo: 3,
    },
  ],
  // Datos para otros dueños...
}

export function OwnerMaintenanceChart({ ownerId }) {
  // Obtener datos para el dueño específico o usar datos predeterminados
  const data = ownerChartData[ownerId] || [
    { name: "Ene", preventivo: 0, correctivo: 0 },
    { name: "Feb", preventivo: 0, correctivo: 0 },
    { name: "Mar", preventivo: 0, correctivo: 0 },
    { name: "Abr", preventivo: 0, correctivo: 0 },
    { name: "May", preventivo: 0, correctivo: 0 },
    { name: "Jun", preventivo: 0, correctivo: 0 },
  ]

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
        <Tooltip />
        <Legend />
        <Bar dataKey="preventivo" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        <Bar dataKey="correctivo" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

