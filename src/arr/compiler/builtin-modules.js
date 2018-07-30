({
  requires: [],
  nativeRequires: [
    "fs",
    "pyret-base/js/secure-loader",
    "pyret-base/js/type-util"
  ],
  provides: {},
  theModule: function(RUNTIME, ns, uri, fs, loader, t) {
    var F = RUNTIME.makeFunction;

    function builtinLocatorFromString(codeContent, headerContent) {
      var staticInfo = JSON.parse(headerContent);

      return RUNTIME.makeObject({
          "get-raw-dependencies":
            F(function() {
              var m = staticInfo;
              if(m.requires) {
                return m.requires.map(function(m) {
                  // NOTE(joe): This allows us to use builtin imports
                  // without a bootstrap for the compiler re-inserting
                  // import-type fields
                  if(!m["import-type"]) {
                    m["import-type"] = "dependency";
                  }
                  return RUNTIME.makeObject(m);
                });
              } else {
                return [];
              }
            }, "get-raw-dependencies"),
          "get-raw-native-modules":
            F(function() {
              var m = staticInfo;
              if(Array.isArray(m.nativeRequires)) {
                return m.nativeRequires.map(RUNTIME.makeString);
              } else {
                return [];
              }
            }, "get-raw-native-modules"),
          "get-raw-datatype-provides":
            F(function() {
              var m = staticInfo;
              if(m.provides && m.provides.datatypes) {
                /*
                if(Array.isArray(m.provides.datatypes)) {
                  return m.provides.datatypes;
                }
                */
                var dts = m.provides.datatypes;
                if(typeof dts === "object") {
                  return Object.keys(dts).map(function(k) {
                    var shorthands = m.provides.shorthands || {};
                    var expanded = t.expandType(dts[k], t.expandRecord(shorthands, {}));
                    return RUNTIME.makeObject({
                      name: k,
                      typ: t.toPyretType(RUNTIME, expanded)
                    });
                  });
                }
                else {
                  throw new Error("Bad datatype specification: " + String(m.provides.datatypes))
                }
              }
              return [];
            }, "get-raw-datatype-provides"),
          "get-raw-alias-provides":
            F(function() {
              var m = staticInfo;
              if(m.provides) {
                if(Array.isArray(m.provides.types)) {
                  return m.provides.types;
                }
                else if(typeof m.provides.aliases === "object") {
                  var aliases = m.provides.aliases;
                  return Object.keys(aliases).map(function(k) {
                    var shorthands = m.provides.shorthands || {};
                    var expanded = t.expandType(aliases[k], t.expandRecord(shorthands, {}));

                    return RUNTIME.makeObject({
                      name: k,
                      typ: t.toPyretType(RUNTIME, expanded)
                    });
                  });
                }
              }
              return [];
            }, "get-raw-alias-provides"),
          "get-raw-value-provides":
            F(function() {
              var m = staticInfo;
              if(m.provides) {
                if(Array.isArray(m.provides.values)) {
                  return m.provides.values;
                }
                else if(typeof m.provides.values === "object") {
                  var vals = m.provides.values;

                  return Object.keys(vals).map(function(k) {
                    var shorthands = m.provides.shorthands || {};
                    var expanded = t.expandType(vals[k], t.expandRecord(shorthands, {}));

                    return RUNTIME.makeObject({
                      name: k,
                      value: t.bindToPyret(RUNTIME, expanded)
                    });
                  });
                }
              }
              return [];
            }, "get-raw-value-provides")
        });
    }

    function getBuiltinLocator(path) {
      if (path === undefined) {
        console.error("Got undefined name in builtin locator");
        console.trace();
      }
      var codeContent = String(fs.readFileSync(fs.realpathSync(path + ".arr.js")));
      var headerContent = String(fs.readFileSync(fs.realpathSync(path + ".arr.json")));
      return builtinLocatorFromString(codeContent, headerContent);
    }
    var O = RUNTIME.makeObject;
    return O({
      "defined-types": {},
      "defined-values": {
        "builtin-raw-locator": RUNTIME.makeFunction(getBuiltinLocator, "builtin-raw-locator"),
        "builtin-raw-locator-from-str": RUNTIME.makeFunction(builtinLocatorFromString, "builtin-raw-locator-from-str")
      },
      "provide-plus-types": O({
        types: { },
        values: O({
          "builtin-raw-locator": RUNTIME.makeFunction(getBuiltinLocator, "builtin-raw-locator"),
          "builtin-raw-locator-from-str": RUNTIME.makeFunction(builtinLocatorFromString, "builtin-raw-locator-from-str")
        })
      }),
      "answer": RUNTIME.nothing
    });
  }
})