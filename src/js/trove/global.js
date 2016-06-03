({
  requires: [ ],
  provides: {
    shorthands: {
      "NumPred": ["arrow", ["Number"], "Boolean"]
    },
    values: {
      "string-to-number": ["arrow", ["String"], ["Option", "Number"]],
      "num-is-integer": "NumPred",
      "num-is-rational": "NumPred",
      "num-is-roughnum": "NumPred",
      "num-is-positive": "NumPred",
      "num-is-negative": "NumPred",
      "num-is-non-positive": "NumPred",
      "num-is-non-negative": "NumPred",
      "num-is-fixnum": "NumPred",

      "num-equal": ["arrow", ["Number", "Number"], "Boolean"]
    },
    aliases: {
      "Number": ["local", "Number"],
      "Exactnum": ["local", "Exactnum"],
      "Roughnum": ["local", "Roughnum"],
      "NumInteger": ["local", "NumInteger"],
      "NumRational": ["local", "NumRational"],
      "NumPositive": ["local", "NumPositive"],
      "NumNegative": ["local", "NumNegative"],
      "NumNonPositive": ["local", "NumNonPositive"],
      "NumNonNegative": ["local", "NumNonNegative"],
      "String": ["local", "String"],
      "Function": ["local", "Function"],
      "Boolean": ["local", "Boolean"],
      "Object": ["local", "Object"],
      "Method": ["local", "Method"],
      "Nothing": ["local", "Nothing"],
      "RawArray": ["local", "RawArray"]
    },
    datatypes: {
      "Number": ["data", "Number", [], [], {}],
      "Exactnum": ["data", "Exactnum", [], [], {}],
      "Roughnum": ["data", "Roughnum", [], [], {}],
      "NumInteger": ["data", "NumInteger", [], [], {}],
      "NumRational": ["data", "NumRational", [], [], {}],
      "NumPositive": ["data", "NumPositive", [], [], {}],
      "NumNegative": ["data", "NumNegative", [], [], {}],
      "NumNonPositive": ["data", "NumNonPositive", [], [], {}],
      "NumNonNegative": ["data", "NumNonNegative", [], [], {}],
      "String": ["data", "String", [], [], {}],
      "Function": ["data", "Function", [], [], {}],
      "Boolean": ["data", "Boolean", [], [], {}],
      "Object": ["data", "Object", [], [], {}],
      "Method": ["data", "Method", [], [], {}],
      "Nothing": ["data", "Nothing", [], [], {}],
      "RawArray": ["data", "RawArray", ["a"], [], {}]
    }
  },
  nativeRequires: [ ],
  theModule: function(runtime, namespace, uri /* intentionally blank */) {
    return runtime.globalModuleObject;
  }
})
