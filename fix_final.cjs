const fs = require('fs');
let text = fs.readFileSync('src/components/admin/AdminPatients.tsx', 'utf-8');

const targetStr = '                {/* Objetivo Clínico / Foco do Tratamento */}';
const replacement = `                      </div>
                    </div>
                  )}
                </div>

                {/* Objetivo Clínico / Foco do Tratamento */}`;

text = text.replace(targetStr, replacement);
fs.writeFileSync('src/components/admin/AdminPatients.tsx', text);
console.log("Restored the missing closing tags!");
