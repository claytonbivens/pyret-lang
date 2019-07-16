#lang pyret

import pathlib as P
import render-error-display as RED
import string-dict as D
import system as SYS
import file("cmdline.arr") as C
import file("cli-module-loader.arr") as CLI
import file("compile-lib.arr") as CL
import file("compile-structs.arr") as CS
import file("file.arr") as F
import file("locators/builtin.arr") as B
import file("server.arr") as S

# this value is the limit of number of steps that could be inlined in case body
DEFAULT-INLINE-CASE-LIMIT = 5

success-code = 0
failure-code = 1

fun main(args :: List<String>) -> Number block:

  this-pyret-dir = P.dirname(P.resolve(C.file-name))

  options = [D.string-dict:
    "serve",
      C.flag(C.once, "Start the Pyret server"),
    "port",
      C.next-val-default(C.Str, "1701", none, C.once, "Port to serve on (default 1701, can also be UNIX file socket or windows pipe)"),
    "build-standalone",
      C.next-val(C.Str, C.once, "Main Pyret (.arr) file to build as a standalone"),
    "build-runnable",
      C.next-val(C.Str, C.once, "Main Pyret (.arr) file to build as a standalone"),
    "require-config",
      C.next-val(C.Str, C.once, "JSON file to use for requirejs configuration of build-runnable"),
    "outfile",
      C.next-val(C.Str, C.once, "Output file for build-runnable"),
    "build",
      C.next-val(C.Str, C.once, "Pyret (.arr) file to build"),
    "run",
      C.next-val(C.Str, C.once, "Pyret (.arr) file to compile and run"),
    "standalone-file",
      C.next-val-default(C.Str, "src/js/base/handalone.js", none, C.once, "Path to override standalone JavaScript file for main"),
    "builtin-js-dir",
      C.next-val(C.Str, C.many, "Directory to find the source of builtin js modules"),
    "builtin-arr-dir",
      C.next-val(C.Str, C.many, "Directory to find the source of builtin arr modules"),
    "allow-builtin-overrides",
      C.flag(C.once, "Allow overlapping builtins defined between builtin-js-dir and builtin-arr-dir"),
    "no-display-progress",
      C.flag(C.once, "Skip printing the \"Compiling X/Y\" progress indicator"),
    "compiled-read-only-dir",
      C.next-val(C.Str, C.many, "Additional directories to search to find precompiled versions of modules"),
    "compiled-dir",
      C.next-val-default(C.Str, "compiled", none, C.once, "Directory to save compiled files to; searched first for precompiled modules"),
    "library",
      C.flag(C.once, "Don't auto-import basics like list, option, etc."),
    "module-load-dir",
      C.next-val-default(C.Str, ".", none, C.once, "Base directory to search for modules"),
    "checks",
      C.next-val(C.Str, C.once, "Specify which checks to execute (all, none, or main)"),
    "profile",
      C.flag(C.once, "Add profiling information to the main file"),
    "check-all",
      C.flag(C.once, "Run checks all modules (not just the main module)"),
    "no-check-mode",
      C.flag(C.once, "Skip checks"),
    "no-spies",
      C.flag(C.once, "Disable printing of all `spy` statements"),
    "allow-shadow",
      C.flag(C.once, "Run without checking for shadowed variables"),
    "improper-tail-calls",
      C.flag(C.once, "Run without proper tail calls"),
    "collect-times",
      C.flag(C.once, "Collect timing information about compilation"),
    "type-check",
      C.flag(C.once, "Type-check the program during compilation"),
    "inline-case-body-limit",
      C.next-val-default(C.Num, DEFAULT-INLINE-CASE-LIMIT, none, C.once, "Set number of steps that could be inlined in case body"),
    "deps-file",
      C.next-val(C.Str, C.once, "Provide a path to override the default dependencies file"),
    "html-file",
      C.next-val(C.Str, C.once, "Name of the html file to generate that includes the standalone (only makes sense if deps-file is the result of browserify)"),
    "no-module-eval",
      C.flag(C.once, "Produce modules as literal functions, not as strings to be eval'd (may break error source locations)"),
    "no-user-annotations",
      C.flag(C.once, "Ignore all annotations in .arr files, treating them as if they were blank."),
    "no-runtime-annotations",
      C.flag(C.once, "Ignore all annotations in the runtime, treating them as if they were blank.")
  ]

  params-parsed = C.parse-args(options, args)

  fun err-less(e1, e2):
    if (e1.loc.before(e2.loc)): true
    else if (e1.loc.after(e2.loc)): false
    else: tostring(e1) < tostring(e2)
    end
  end

  cases(C.ParsedArguments) params-parsed block:
    | success(r, rest) =>
      checks = 
        if r.has-key("no-check-mode") or r.has-key("library"): "none"
        else if r.has-key("checks"): r.get-value("checks")
        else: "all" end
      builtin-js-dirs = if r.has-key("builtin-js-dir"):
        if is-List(r.get-value("builtin-js-dir")):
            r.get-value("builtin-js-dir")
          else:
            [list: r.get-value("builtin-js-dir")]
          end
      else:
        empty
      end
      enable-spies = not(r.has-key("no-spies"))
      allow-shadowed = r.has-key("allow-shadow")
      module-dir = r.get-value("module-load-dir")
      inline-case-body-limit = r.get-value("inline-case-body-limit")
      type-check = r.has-key("type-check")
      tail-calls = not(r.has-key("improper-tail-calls"))
      compiled-dir = r.get-value("compiled-dir")
      standalone-file = r.get-value("standalone-file")
      add-profiling = r.has-key("profile")
      display-progress = not(r.has-key("no-display-progress"))
      html-file = if r.has-key("html-file"):
            some(r.get-value("html-file"))
          else:
            none
          end
      module-eval = not(r.has-key("no-module-eval"))
      user-annotations = not(r.has-key("no-user-annotations"))
      runtime-annotations = not(r.has-key("no-runtime-annotations"))
      when r.has-key("builtin-js-dir"):
        B.set-builtin-js-dirs(r.get-value("builtin-js-dir"))
      end
      when r.has-key("builtin-arr-dir"):
        B.set-builtin-arr-dirs(r.get-value("builtin-arr-dir"))
      end
      when r.has-key("allow-builtin-overrides"):
        B.set-allow-builtin-overrides(r.get-value("allow-builtin-overrides"))
      end
      if r.has-key("checks") and r.has-key("no-check-mode") and not(r.get-value("checks") == "none") block:
        print-error("Can't use --checks " + r.get-value("checks") + " with -no-check-mode\n")
        failure-code
      else:
        if r.has-key("checks") and r.has-key("check-all") and not(r.get-value("checks") == "all") block:
          print-error("Can't use --checks " + r.get-value("checks") + " with -check-all\n")
          failure-code
        else:
          if not(is-empty(rest)) block:
            print-error("No longer supported\n")
            failure-code
          else:
            if r.has-key("build-runnable") block:
              outfile = if r.has-key("outfile"):
                r.get-value("outfile")
              else:
                r.get-value("build-runnable") + ".jarr"
              end
              compile-opts = CS.make-default-compile-options(this-pyret-dir)
              CLI.build-runnable-standalone(
                  r.get-value("build-runnable"),
                  r.get("require-config").or-else(P.resolve(P.join(this-pyret-dir, "config.json"))),
                  outfile,
                  compile-opts.{
                    this-pyret-dir: this-pyret-dir,
                    standalone-file: standalone-file,
                    checks : checks,
                    type-check : type-check,
                    allow-shadowed : allow-shadowed,
                    collect-all: false,
                    collect-times: r.has-key("collect-times") and r.get-value("collect-times"),
                    ignore-unbound: false,
                    proper-tail-calls: tail-calls,
                    compiled-cache: compiled-dir,
                    compiled-read-only: r.get("compiled-read-only-dir").or-else(empty),
                    display-progress: display-progress,
                    inline-case-body-limit: inline-case-body-limit,
                    deps-file: r.get("deps-file").or-else(compile-opts.deps-file),
                    html-file: html-file,
                    module-eval: module-eval,
                    user-annotations: user-annotations,
                    runtime-annotations: runtime-annotations,
                    builtin-js-dirs: compile-opts.builtin-js-dirs.append(builtin-js-dirs),
                  })
              success-code
            else if r.has-key("serve"):
              port = r.get-value("port")
              S.serve(port, this-pyret-dir)
              success-code
            else if r.has-key("build-standalone"):
              print-error("Use build-runnable instead of build-standalone\n")
              failure-code
              #|
              CLI.build-require-standalone(r.get-value("build-standalone"),
                  CS.default-compile-options.{
                    checks : checks,
                    type-check : type-check,
                    allow-shadowed : allow-shadowed,
                    collect-all: false,
                    collect-times: r.has-key("collect-times") and r.get-value("collect-times"),
                    ignore-unbound: false,
                    proper-tail-calls: tail-calls,
                    compiled-cache: compiled-dir,
                    display-progress: display-progress
                  })
               |#
            else if r.has-key("build"):
              result = CLI.compile(r.get-value("build"),
                CS.default-compile-options.{
                  checks : checks,
                  type-check : type-check,
                  allow-shadowed : allow-shadowed,
                  collect-all: false,
                  ignore-unbound: false,
                  proper-tail-calls: tail-calls,
                  compile-module: false,
                  display-progress: display-progress,
                  builtin-js-dirs: builtin-js-dirs,
                })
              failures = filter(CS.is-err, result.loadables)
              if is-link(failures) block:
                for each(f from failures) block:
                  for lists.each(e from f.errors) block:
                    print-error(tostring(e))
                    print-error("\n")
                  end
                  print-error("There were compilation errors\n")
                end
                failure-code
              else:
                success-code
              end
            else if r.has-key("run"):
              run-args =
                if is-empty(rest):
                  empty
                else:
                  rest.rest
                end
              result = CLI.run(r.get-value("run"), CS.default-compile-options.{
                  standalone-file: standalone-file,
                  display-progress: display-progress,
                  checks: checks,
                  builtin-js-dirs: builtin-js-dirs,
                }, run-args)
              _ = print(result.message + "\n")
              result.exit-code
            else:
              block:
                print-error(C.usage-info(options).join-str("\n"))
                print-error("Unknown command line options\n")
                failure-code
              end
            end
          end
        end
      end
    | arg-error(message, partial) =>
      block:
        print-error(message + "\n")
        print-error(C.usage-info(options).join-str("\n"))
        failure-code
      end
  end
end

exit-code = main(C.other-args)
SYS.exit-quiet(exit-code)
