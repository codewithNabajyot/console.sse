
import zipfile
import xml.etree.ElementTree as ET
import sys

def get_shared_strings(zf):
    try:
        with zf.open('xl/sharedStrings.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            # Shared strings use namespaces
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            return [t.text for t in root.findall('.//ns:t', ns)]
    except KeyError:
        return []

def get_sheet_headers(zf, sheet_path, shared_strings):
    with zf.open(sheet_path) as f:
        tree = ET.parse(f)
        root = tree.getroot()
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        
        # Row 1 is usually headers
        row1 = root.find('.//ns:row[@r="1"]', ns)
        if row1 is None:
            # Try finding the first row if row 1 is missing
            row1 = root.find('.//ns:row', ns)
            
        if row1 is None:
            return []
            
        headers = []
        for cell in row1.findall('ns:c', ns):
            cell_type = cell.get('t')
            v = cell.find('ns:v', ns)
            if v is not None:
                val = v.text
                if cell_type == 's':
                    headers.append(shared_strings[int(val)])
                else:
                    headers.append(val)
            else:
                headers.append("")
        return headers

def main():
    xlsx_path = sys.argv[1]
    with zipfile.ZipFile(xlsx_path, 'r') as zf:
        shared_strings = get_shared_strings(zf)
        
        # We know sheet mappings from workbook.xml
        # Sheet 4: Project Master
        # Sheet 5: Invoice Tracker
        # Sheet 6: Income
        # Sheet 7: Expenses
        
        sheet_map = {
            'xl/worksheets/sheet4.xml': 'Project Master',
            'xl/worksheets/sheet5.xml': 'Invoice Tracker',
            'xl/worksheets/sheet6.xml': 'Income',
            'xl/worksheets/sheet7.xml': 'Expenses',
            'xl/worksheets/sheet2.xml': 'Operations'
        }
        
        for path, name in sheet_map.items():
            try:
                headers = get_sheet_headers(zf, path, shared_strings)
                print(f"{name}: {headers}")
            except KeyError:
                print(f"{name}: Not found at {path}")

if __name__ == "__main__":
    main()
