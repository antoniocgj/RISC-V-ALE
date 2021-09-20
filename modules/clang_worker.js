

var expected_result = "none";
var files = []
onmessage = function(e) {
  switch(e.data.type){
    case "add_files":
      console.log("Files", e.data.files);
      files = e.data.files;
      break;
    case "clang_c":
      if(e.data.file) files = e.data.files;
      console.log(e.data.args);
      expected_result = e.data.out_filename;
      Module.arguments = ["-cc1", "-triple", "riscv32--", "-emit-obj", "-mrelax-all", "-disable-free", "-disable-llvm-verifier", "-discard-value-names", "-main-file-name", "main_file", "-mrelocation-model", "static", "-mthread-model", "posix", "-mframe-pointer=all", "-fmath-errno", "-fno-rounding-math", "-mconstructor-aliases", "-nostdsysteminc", "-target-feature", "+m", "-target-feature", "+a", "-target-feature", "+f", "-target-feature", "+d", "-target-feature", "-relax", "-target-abi", "ilp32d", "-fno-split-dwarf-inlining", "-debugger-tuning=gdb", "-resource-dir", "/", "-internal-isystem", "include", "-fdebug-compilation-dir", "/", "-ferror-limit", "19", "-fno-signed-char", "-fgnuc-version=4.2.1", "-fobjc-runtime=gcc", "-fcolor-diagnostics", "-faddrsig", "-x", "c", e.data.args].flat();
      importScripts("clang.js");
      break;

    case "clang_s":
      if(e.data.file) files = e.data.files;
      console.log(e.data.args);
      expected_result = e.data.out_filename;
      Module.arguments = ["-cc1as", "-triple", "riscv32--", "-filetype", "obj", "-main-file-name", "main_file", "-target-feature", "+m", "-target-feature", "+a", "-target-feature", "+f", "-target-feature", "+d", "-target-feature", "-relax", "-fdebug-compilation-dir", "/", "-dwarf-debug-producer", "clang, version, 10.0.0-4ubuntu1, ", "-dwarf-version=4", "-mrelocation-model", "static", "-target-abi", "ilp32d", e.data.args].flat();
      importScripts("clang.js");
      break;

    case 'ld':
      if(e.data.file) files = e.data.files;
      console.log(e.data.args);
      expected_result = e.data.out_filename;
      Module.thisProgram = "ld.lld",
      Module.arguments = ["--threads=1", e.data.args].flat();
      importScripts("ld.lld.js")
      break;

    case "fs":
      console.log(FS.readdir("/"));
      console.log(FS.readdir("/working/"));
      break;
  }
};

function initFS() {
  FS.init(null, null, null);
  FS.mkdir('/working');
  if(files){
    FS.mount(WORKERFS, {
      files: files, // Array of File objects or FileList
    }, '/working');
    for (let index = 0; index < files.length; index++) {
      FS.symlink('/working/' + files[index].name, '/' + files[index].name.replace(" ", "_"));
    }
  }
}

function returnResult(){
  console.log(expected_result);
  if(FS.readdir("/").includes(expected_result)) this.postMessage({type: "file", file: FS.readFile(expected_result)});
  else this.postMessage({type: "file", file: -1});
}

var Module = {
  arguments : ["--version"],
  // arguments : ["-cc1as", "-triple", "riscv32--", "-filetype", "obj", "-main-file-name", "hello.s", "-target-feature", "+m", "-target-feature", "+a", "-target-feature", "+f", "-target-feature", "+d", "-target-feature", "-relax", "-fdebug-compilation-dir", "/home/antonio/mc404/labs/trab1", "-dwarf-debug-producer", "clang, version, 10.0.0-4ubuntu1, ", "-dwarf-version=4", "-mrelocation-model", "static", "-target-abi", "ilp32d", "-o", "hello.o", "hello.s"],
  // arguments : ["-cc1", "-triple", "riscv32--", "-emit-obj", "-mrelax-all", "-disable-free", "-disable-llvm-verifier", "-discard-value-names", "-main-file-name", "lab3.c", "-mrelocation-model", "static", "-mthread-model", "posix", "-mframe-pointer=all", "-fmath-errno", "-fno-rounding-math", "-mconstructor-aliases", "-nostdsysteminc", "-target-feature", "+m", "-target-feature", "+a", "-target-feature", "+f", "-target-feature", "+d", "-target-feature", "-relax", "-target-abi", "ilp32d", "-fno-split-dwarf-inlining", "-debugger-tuning=gdb", "-resource-dir", "/usr/lib/llvm-10/lib/clang/10.0.0", "-internal-isystem", "include", "-fdebug-compilation-dir", "/home/antonio/mc404/labs/lab3", "-ferror-limit", "19", "-fno-signed-char", "-fgnuc-version=4.2.1", "-fobjc-runtime=gcc", "-fcolor-diagnostics", "-faddrsig", "-o", "lab3.o", "-x", "c", "lab3.c"],
  preRun : [initFS],
  print : function (text) {postMessage({type: "stdio", stdioNumber: 1, msg: text});},
  printErr : function (text) {postMessage({type: "stdio", stdioNumber: 2, msg: text});},
  postRun : [returnResult]
};


