const fs = require('fs');
let text = fs.readFileSync('src/components/admin/AdminPatients.tsx', 'utf-8');

const anchor = 'placeholder="Ex: Plano 2x por semana (Terças e Quintas às 09:00)"';

const block = `
                <div className="mt-4 p-3 border border-emerald-100 bg-emerald-50 rounded-xl">
                  <label className="flex items-center space-x-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={editHasRecurrence} onChange={(e) => setEditHasRecurrence(e.target.checked)} className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
                    <span className="font-bold text-sm text-emerald-900">Gerar Agendamentos Recorrentes (Agenda)</span>
                  </label>
                  {editHasRecurrence && (
                    <div className="space-y-3 mt-2 pl-6">
                      <div>
                        <span className="block text-xs font-semibold text-emerald-800 mb-2">Dias da semana e horários:</span>
                        <div className="flex flex-wrap gap-2">
                          {[0,1,2,3,4,5,6].map(dow => {
                            const daysStr = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                            const isSelected = editRecurrenceDays.some(d => d.dayOfWeek === dow);
                            return (
                              <div key={dow} className={\`flex items-center gap-1 border rounded-lg px-2 py-1 \${isSelected ? "bg-emerald-600 border-emerald-700 text-white" : "bg-white border-slate-300 text-slate-700"}\`}>
                                <input type="checkbox" checked={isSelected} onChange={(e) => {
                                  if (e.target.checked) setEditRecurrenceDays([...editRecurrenceDays, { dayOfWeek: dow, time: "09:00" }]);
                                  else setEditRecurrenceDays(editRecurrenceDays.filter(d => d.dayOfWeek !== dow));
                                }} className="hidden" id={\`dow-\${dow}\`} />
                                <label htmlFor={\`dow-\${dow}\`} className="text-xs font-bold cursor-pointer">{daysStr[dow]}</label>
                                {isSelected && (
                                  <input type="time" value={editRecurrenceDays.find(d => d.dayOfWeek === dow)?.time || "09:00"} onChange={(e) => {
                                    setEditRecurrenceDays(editRecurrenceDays.map(d => d.dayOfWeek === dow ? { ...d, time: e.target.value } : d));
                                  }} className="ml-1 px-1 py-0.5 text-[10px] text-slate-900 rounded bg-emerald-50 border border-emerald-200 outline-none" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-emerald-700 mt-2 font-medium">
                          O sistema irá manter agendamentos gerados automaticamente até 60 dias para frente baseados nestes horários.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
`;

// we find the exact line containing the anchor and then we append the block after the div that closes the input
// Let's just find the exact block:
const targetStr = `                  <input
                    type="text"
                    value={editTreatmentPlan}
                    onChange={(e) => setEditTreatmentPlan(e.target.value)}
                    placeholder="Ex: Plano 2x por semana (Terças e Quintas às 09:00)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#1B2E24] focus:outline-none font-medium"
                  />
                </div>`;

if(text.includes(targetStr)) {
  text = text.replace(targetStr, targetStr + block);
  fs.writeFileSync('src/components/admin/AdminPatients.tsx', text);
  console.log("Success");
} else {
  console.log("Target string not found!");
}
