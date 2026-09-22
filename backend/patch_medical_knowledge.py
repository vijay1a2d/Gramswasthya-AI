import re

file_path = '/Users/shiva/Desktop/gramswasthya/backend/utils/medical_knowledge.py'
with open(file_path, 'r') as f:
    content = f.read()

specialists = {
    "tuberculosis": "Pulmonologist / Infectious Disease Specialist",
    "pneumonia": "Pulmonologist / General Physician",
    "malaria": "General Physician / Internal Medicine",
    "dengue": "General Physician / Infectious Disease Specialist",
    "cholera": "Gastroenterologist / General Physician",
    "typhoid": "General Physician / Internal Medicine",
    "diabetes_uncontrolled": "Endocrinologist / Diabetologist",
    "hypertension": "Cardiologist / General Physician",
    "pre_eclampsia": "Obstetrician / Gynecologist",
    "upper_respiratory_infection": "General Physician",
    "gastroenteritis": "Gastroenterologist / General Physician",
    "measles": "Pediatrician / Infectious Disease Specialist",
}

for disease, spec in specialists.items():
    # Find the source line for this disease block
    pattern = r'("source"\s*:\s*".*?"\s*,)'
    # We need to replace the source line for the *specific* disease
    # A bit tricky with regex, let's use a simpler approach. 
    # The diseases are keys in TREATMENT_GUIDELINES. 
    # Let's just do a string replace for the source line if it exists.
    # Actually, better to parse? No, we can just replace `"source": "..."` but we need to know which disease it's under.
    pass

# Better to use AST or just simple string matching since Python file structure is predictable.
# Actually, I can just do:
lines = content.split('\n')
in_treatment_guidelines = False
current_disease = None
out_lines = []
for line in lines:
    if line.startswith('TREATMENT_GUIDELINES = {'):
        in_treatment_guidelines = True
    
    if in_treatment_guidelines:
        m = re.match(r'^    "([a-z_]+)": \{', line)
        if m:
            current_disease = m.group(1)
            
        m2 = re.match(r'^\s+"source"\s*:\s*".*?",?', line)
        if m2 and current_disease in specialists:
            out_lines.append(line)
            out_lines.append(f'        "recommended_specialist": "{specialists[current_disease]}",')
            current_disease = None  # Reset so we don't add it twice
            continue
            
    out_lines.append(line)

with open(file_path, 'w') as f:
    f.write('\n'.join(out_lines))

print("Patched medical_knowledge.py")
