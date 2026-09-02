sed -i '/<input/i \
                <div className="mt-4 p-3 border border-emerald-100 bg-emerald-50 rounded-xl">\
                  <label className="flex items-center space-x-2 cursor-pointer mb-3">\
                    <input type="checkbox" checked={editHasRecurrence} onChange={(e) => setEditHasRecurrence(e.target.checked)} className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4" />\
                    <span className="font-bold text-sm text-emerald-900">Gerar Agendamentos Recorrentes Automaticamente</span>\
                  </label>\
                  {editHasRecurrence && (\
                    <div className="space-y-3 mt-2 pl-6">\
                      <div>\
                        <span className="block text-xs font-semibold text-emerald-800 mb-2">Dias da semana e horários:</span>\
                        <div className="flex flex-wrap gap-2">\
                          {[1,2,3,4,5].map(dow => {\
                            const daysStr = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];\
                            const isSelected = editRecurrenceDays.some(d => d.dayOfWeek === dow);\
                            return (\
                              <div key={dow} className={`flex items-center gap-1 border rounded-lg px-2 py-1 ${isSelected ? "bg-emerald-600 border-emerald-700 text-white" : "bg-white border-slate-300 text-slate-700"}`}>\
                                <input type="checkbox" checked={isSelected} onChange={(e) => {\
                                  if (e.target.checked) setEditRecurrenceDays([...editRecurrenceDays, { dayOfWeek: dow, time: "09:00" }]);\
                                  else setEditRecurrenceDays(editRecurrenceDays.filter(d => d.dayOfWeek !== dow));\
                                }} className="hidden" id={`dow-${dow}`} />\
                                <label htmlFor={`dow-${dow}`} className="text-xs font-bold cursor-pointer">{daysStr[dow]}</label>\
                                {isSelected && (\
                                  <input type="time" value={editRecurrenceDays.find(d => d.dayOfWeek === dow)?.time || "09:00"} onChange={(e) => {\
                                    setEditRecurrenceDays(editRecurrenceDays.map(d => d.dayOfWeek === dow ? { ...d, time: e.target.value } : d));\
                                  }} className="ml-1 px-1 py-0.5 text-[10px] text-slate-900 rounded bg-emerald-50 border-none outline-none" />\
                                )}\
                              </div>\
                            );\
                          })}\
                        </div>\
                        <p className="text-[10px] text-emerald-700 mt-2 font-medium">\
                          Ao salvar, a Agenda Eletrônica irá garantir que os horários existam para os próximos 60 dias.\
                        </p>\
                      </div>\
                    </div>\
                  )}\
                </div>\
' src/components/admin/AdminPatients.tsx
