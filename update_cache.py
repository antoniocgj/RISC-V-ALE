#!/usr/bin/env python3

import sys,os

sw_file = open("service_worker.js", "r")
sw_data = sw_file.readlines()
sw_file.close()

files_to_cache = ["./"]

for path, subdirs, files in os.walk("."):
  for name in files:
    if(".git" not in os.path.join(path, name)):
      files_to_cache.append("" + os.path.join(path, name))
      print(files_to_cache[-1])

files_to_cache.remove("./service_worker.js")
files_to_cache.remove("./update_cache.py")

# update cache number
cache_number_pos = sw_data[2].index(":") + 1
sw_data[2] = sw_data[2][:cache_number_pos] + str(int(sw_data[2][cache_number_pos:-3]) + 1) + "';\n"

# update files
sw_data[3] = "var urlsToCache = " + str(files_to_cache) + ";\n"

# write back
sw_file = open("service_worker.js", "w")
sw_file.write("".join(sw_data))
