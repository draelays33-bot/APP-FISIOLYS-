const fs = require('fs');
let text = fs.readFileSync('src/components/admin/AdminPatients.tsx', 'utf-8');

// I will look for:
//                       </div>
//                     </div>
//                   )}
//                 </div>
//             <input
// And also all other occurrences of that dangling end block.

// The simplest way to fix this is to checkout the file. But I don't have git.
// Wait, I can just replace `                      </div>\n                    </div>\n                  )}\n                </div>\n` if it's placed incorrectly.
// Actually, since I know exactly what is left over, let's look at the file.

let lines = text.split('\n');
let newLines = [];
let i = 0;
while (i < lines.length) {
  if (lines[i] === '                      </div>' &&
      lines[i+1] === '                    </div>' &&
      lines[i+2] === '                  )}' &&
      lines[i+3] === '                </div>') {
      // Is this our dangling block? Yes, because we didn't have this exact sequence otherwise.
      i += 4;
      continue;
  }
  newLines.push(lines[i]);
  i++;
}

fs.writeFileSync('src/components/admin/AdminPatients.tsx', newLines.join('\n'));
console.log('Fixed dangling ends');
