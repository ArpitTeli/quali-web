import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534']
const GREY = '#333'

const defaultData = []

export default function CompetitionWidget({ data = defaultData }) {
  const chartData = data.length > 0
    ? data.map((item, index) => ({
        ...item,
        fill: COLORS[index % COLORS.length],
        opacity: [1, 0.7, 0.5, 0.35, 0.2][index] || 0.2,
      }))
    : [{ name: 'empty', leads: 1, fill: GREY, opacity: 0.3 }]

  const total = data.reduce((sum, d) => sum + d.leads, 0)
  const sorted = [...data].sort((a, b) => b.leads - a.leads)
  const podium = [sorted[0], sorted[1], sorted[2]]

  return (
    <div className="cw-wrapper">
      <div className="cw-card">
        <h3 className="cw-title">Leaderboard</h3>

        <div className="cw-content">
          <div className="cw-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="100%"
                  paddingAngle={data.length > 0 ? 4 : 0}
                  dataKey="leads"
                  stroke="none"
                  cornerRadius={data.length > 0 ? 4 : 0}
                  isAnimationActive={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      fillOpacity={entry.opacity}
                    />
                  ))}
                </Pie>
                {data.length > 0 && (
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length && payload[0].payload.name !== 'empty') {
                        return (
                          <div className="cw-tooltip">
                            <span className="cw-tooltip-name">{payload[0].payload.name}</span>
                            <span className="cw-tooltip-val">{payload[0].value} leads</span>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
            <div className="cw-total">
              <span className="cw-total-num">{total}</span>
              <span className="cw-total-label">total</span>
            </div>
          </div>

          <div className="cw-podium">
            {[0, 1, 2].map(i => {
              const item = podium[i]
              return (
                <div key={i} className={`cw-podium-row ${item ? 'cw-podium-filled' : ''}`}>
                  <span className="cw-podium-rank">{i + 1}-</span>
                  <span className="cw-podium-name">{item ? item.name : ''}</span>
                  {item && <span className="cw-podium-val">{item.leads}</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
