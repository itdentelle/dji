import os
import re

files_to_update = [
    r'app\(auth)\login\page.tsx',
    r'app\(dashboard)\page.tsx',
    r'app\(employee)\input\page.tsx',
    r'app\chatbot\page.tsx',
    r'app\qc\page.tsx',
    r'components\forms\EmployeeForm.tsx',
    r'components\forms\LoginForm.tsx',
    r'components\forms\PINPad.tsx',
    r'components\forms\QCInspectionModal.tsx',
    r'components\layout\Sidebar.tsx',
    r'components\ui\DebugToolbar.tsx'
]

# Replacement mappings
replacements = [
    (r'#0f5d3e', '#0070bc'), # Main dark theme color -> DJI Blue
    (r'#0b3a26', '#004777'), # Very dark bg color -> Darker Blue
    (r'#3cd070', '#00a2ff'), # Bright accent color -> Bright Blue
    (r'emerald', 'sky'),     # Tailwind emerald -> sky
]

for rel_path in files_to_update:
    filepath = os.path.join(r'C:\Users\DWIKY SUMARLIN\Documents\PORTOFOLIO\dji', rel_path)
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for old, new in replacements:
        content = re.sub(old, new, content, flags=re.IGNORECASE)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Colors updated successfully.')
