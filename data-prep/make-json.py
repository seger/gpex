import json
from Bio import Entrez
from openpyxl import load_workbook

Entrez.email = "segerdel@ohsu.edu"


def make_json(coll):

    ws = wb.get_sheet_by_name(coll)

    columns = []
    for cell in ws.rows[0]:
        columns.append(cell.value)
    data = []
    for row in ws.rows[1:]:
        cells = []
        for cell in row:
            if coll == "relationship" and cell.value.startswith("REF-"):
                cells.append(cell.value.split(", "))
            else:
                cells.append(cell.value)
        row_data = {}
        for i in range(len(columns)):
            row_data[columns[i]] = cells[i]
        data.append(row_data)

    with open("../app/json/" + coll + ".json", "w") as outfile:
        json.dump(data, outfile)


"""
Create JSON files with entities, relationships.
"""

wb = load_workbook("AppData.xlsx")

collections = ["entity", "relationship"]

for coll in collections:
    make_json(coll)


"""
Create a view summarizing what each entity in the graph is related to
  and output to a JSON file.
"""

with open("../app/json/entity.json") as json_file:
    ent = json.load(json_file)

with open("../app/json/relationship.json") as json_file:
    rel = json.load(json_file)

labels_partial = ["Genotypes", "Variants", "Phenotypes", "Diseases"]
data_types = ["gene", "genotype", "variant", "phenotype", "disease"]

e_rel_type = {}
ent_ids = []
for e in ent:
    e_rel_type[e["id"]] = e["data_type"]
    ent_ids.append(e["id"])

e_rel_view = []
for e in ent:
    if e["data_type"] == "gene":
        labels = ["Homologs"] + labels_partial
    else:
        labels = ["Genes"] + labels_partial
    e_rels = {"id": e["id"]}
    e_rels["rels"] = []
    for i in range(0,5):
        e_rels["rels"].append([labels[i], data_types[i], []])
    e_rel_view.append(e_rels)

for v in e_rel_view:
    for r in rel:
        if v["id"] == r["source"]:
            v["rels"][data_types.index(e_rel_type[r["target"]])][2].append(ent_ids.index(r["target"]))
        elif v["id"] == r["target"]:
            v["rels"][data_types.index(e_rel_type[r["source"]])][2].append(ent_ids.index(r["source"]))
        else:
            pass

for v in e_rel_view:
    ct = 0
    for rel in v["rels"]:
        ct += len(rel[2])
    v["total_rel"] = ct

with open("../app/json/entity-rel-view.json", "w") as outfile:
    json.dump(e_rel_view, outfile)


"""
Create JSON file with refs.
"""

ws = wb.get_sheet_by_name("ref")

data = {}
for row in ws.rows[1:]:
    dict = {}
    if row[1].value == None:
        dict["pmid"] = None
        dict["title"] = row[2].value
    else:
        pmid = str(row[1].value)
        dict["pmid"] = pmid
        handle = Entrez.efetch("pubmed", id=pmid, retmode="xml")
        records = Entrez.parse(handle)
        for record in records:
            dict["title"] = record['MedlineCitation']['Article']['ArticleTitle']
        handle.close()
    data[row[0].value] = dict

with open("../app/json/ref.json", "w") as outfile:
    json.dump(data, outfile)
