'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Package,
  Layers,
  Code2,
  Users,
  TrendingUp,
  Download,
  ArrowRight,
  Calendar,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const relatorios = [
  {
    id: '1',
    titulo: 'Relatório de Produção',
    descricao: 'Eficiência, peças produzidas e tempo de máquina',
    icon: BarChart3,
    tipo: 'producao',
    cor: 'bg-primary/10 text-primary',
    geradoEm: '2026-05-25T08:00:00',
  },
  {
    id: '2',
    titulo: 'Controle de Estoque',
    descricao: 'Inventário de peças, entradas e saídas',
    icon: Package,
    tipo: 'estoque',
    cor: 'bg-accent/10 text-accent',
    geradoEm: '2026-05-25T07:30:00',
  },
  {
    id: '3',
    titulo: 'Retalhos e Aproveitamento',
    descricao: 'Taxa de aproveitamento e gestão de retalhos',
    icon: Layers,
    tipo: 'retalhos',
    cor: 'bg-success/10 text-success',
    geradoEm: '2026-05-24T18:00:00',
  },
  {
    id: '4',
    titulo: 'Programas CNC',
    descricao: 'Execuções, tempo médio e performance',
    icon: Code2,
    tipo: 'programas',
    cor: 'bg-warning/10 text-warning',
    geradoEm: '2026-05-24T17:00:00',
  },
  {
    id: '5',
    titulo: 'Desempenho Operacional',
    descricao: 'Métricas de operadores e turnos',
    icon: Users,
    tipo: 'operacional',
    cor: 'bg-primary/10 text-primary',
    geradoEm: '2026-05-23T16:00:00',
  },
  {
    id: '6',
    titulo: 'Tendências e Previsões',
    descricao: 'Análise preditiva de demanda e produção',
    icon: TrendingUp,
    tipo: 'predicao',
    cor: 'bg-accent/10 text-accent',
    geradoEm: '2026-05-22T12:00:00',
  },
]

const producaoMensal = [
  { mes: 'Jan', producao: 8200 },
  { mes: 'Fev', producao: 9100 },
  { mes: 'Mar', producao: 7800 },
  { mes: 'Abr', producao: 9600 },
  { mes: 'Mai', producao: 8900 },
]

const distribuicaoMaterial = [
  { name: 'Aço Inox', value: 38, color: '#0f4c5c' },
  { name: 'Aço Carbono', value: 32, color: '#000080' },
  { name: 'Alumínio', value: 18, color: '#10b981' },
  { name: 'Outros', value: 12, color: '#6b7280' },
]

export default function RelatoriosPage() {
  const { canEdit } = useAuth()

  return (
    <PermissionGate module="relatorios">
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Análises e exportações dos dados industriais"
        breadcrumbs={[{ label: 'Esync', href: '/dashboard' }, { label: 'Relatórios' }]}
        actions={
          canEdit('relatorios') ? (
            <Button variant="outline" size="sm">
              <Calendar size={14} />
              Agendar Relatório
            </Button>
          ) : undefined
        }
      />

      {/* Charts Overview */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Produção Mensal</CardTitle>
              <CardDescription>Peças produzidas por mês em 2026</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={producaoMensal} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid hsl(220 13% 91%)',
                      borderRadius: '10px',
                      fontSize: 12,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    }}
                    formatter={(v) => [`${Number(v).toLocaleString('pt-BR')} peças`, 'Produção']}
                  />
                  <Bar dataKey="producao" fill="#0f4c5c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Distribuição por Material</CardTitle>
              <CardDescription>Participação de cada material na produção</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={distribuicaoMaterial}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {distribuicaoMaterial.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-1 flex-col gap-2">
                  {distribuicaoMaterial.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-foreground">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Reports List */}
      <h2 className="mb-3 text-sm font-semibold text-foreground">Relatórios Disponíveis</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {relatorios.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-card cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
          >
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${r.cor}`}>
              <r.icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{r.titulo}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{r.descricao}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <Download size={10} />
                  Exportar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[11px] text-primary hover:text-primary/80"
                >
                  Ver relatório
                  <ArrowRight size={10} />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
    </PermissionGate>
  )
}
