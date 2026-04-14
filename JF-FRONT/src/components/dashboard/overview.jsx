"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

const data = [
  {
    name: "Ene",
    preventivo: 12,
    correctivo: 5,
  },
  {
    name: "Feb",
    preventivo: 18,
    correctivo: 7,
  },
  {
    name: "Mar",
    preventivo: 15,
    correctivo: 9,
  },
  {
    name: "Abr",
    preventivo: 20,
    correctivo: 3,
  },
  {
    name: "May",
    preventivo: 22,
    correctivo: 8,
  },
  {
    name: "Jun",
    preventivo: 19,
    correctivo: 6,
  },
]

export function Overview() {
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

