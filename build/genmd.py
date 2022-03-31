import json
import jsonschema2md

parser = jsonschema2md.Parser(
    examples_as_yaml=False,
    show_examples="all",
)

with open("./schemas/arena-schema-files.json", "r") as json_file_all:
    files = json.load(json_file_all)
idx = 0
for file in files:
    print(files[file])
    fn = files[file]["file"]
    t = files[file]["title"]

    md_lines = ''
    md_lines+=('---\n')
    md_lines+=(f'title: {t}\n')
    md_lines+=(f'nav_order: {idx}\n')
    md_lines+=('layout: default\n')
    md_lines+=('parent: ARENA Optionsv')
    md_lines+=('---\n')
    md_lines+=('\n')

    with open(fn, "r") as json_file:
        md_lines+=(parser.parse_schema(json.load(json_file)))
    out = ''.join(md_lines)
    print(out)
    f = open(f"{fn[:-5]}.md", "w")
    f.write(out)
    f.close()
    idx+=1
# "box":{
#    "description":"Box Geometry",
#    "file":"schemas/box.json",
#    "title":"Box"
# },



# with open("./examples/food.json", "r") as json_file:
#     md_lines = parser.parse_schema(json.load(json_file))
# print(''.join(md_lines))


# jsonschema2md build/schemas/arena-schema-files.json build/schemas/arena-schema-files.md

# Usage: jsonschema2md [OPTIONS] <input.json> <output.md>

#   Convert JSON Schema to Markdown documentation.

# Options:
#   --version                       Show the version and exit.
#   --examples-as-yaml BOOLEAN      Parse examples in YAML-format instead of
#                                   JSON.
#   --show-examples [all|properties|object]
#                                   Parse examples for only the main object,
#                                   only properties, or all.
#   --help                          Show this message and exit.

# where is output directory?

# read arena-schema-files.json

# loop through file manifest

# export each file as .md

# prepend each file with jekyll preamble
