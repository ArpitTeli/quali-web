import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534']

const defaultData = []

export default function CompetitionWidget({ data = defaultData }) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
    opacity: [1, 0.7, 0.5, 0.35, 0.2][index] || 0.2,
  }))

  const total = data.reduce((sum, d) => sum + d.leads, 0)

  return (
    <div className="cw-wrapper">
      <div className="cw-card">
        <h3 className="cw-title">Leaderboard</h3>

        <div className="cw-content">
          {data.length > 0 ? (
            <>
              <div className="cw-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius="65%"
                      outerRadius="100%"
                      paddingAngle={4}
                      dataKey="leads"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fill}
                          fillOpacity={entry.opacity}
                          className="cursor-pointer transition-all duration-300 outline-none hover:opacity-80"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
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
                  </PieChart>
                </ResponsiveContainer>
                <div className="cw-total">
                  <span className="cw-total-num">{total}</span>
                  <span className="cw-total-label">total</span>
                </div>
              </div>

              <div className="cw-legend">
                {chartData.map((item, i) => (
                  <div key={i} className="cw-legend-item">
                    <div className="cw-legend-dot" style={{ backgroundColor: item.fill, opacity: item.opacity }} />
                    <span className="cw-legend-name">{item.name}</span>
                    <span className="cw-legend-val">{item.leads}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="cw-empty">
              <p>No pushes yet</p>
              <p className="cw-empty-sub">Start pushing leads to see the leaderboard</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
