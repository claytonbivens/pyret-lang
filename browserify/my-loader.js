var define, myrequire;
(function () {
    var isArray = function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };

    // module name -> module object
    var moduleTable = {};

    function moduleResolved(modName) {
        return (modName in moduleTable) && (moduleTable[modName].resolved);
    }

    function evaluateModuleFn(moduleObj) {
        console.log("Evaluating " + moduleObj.name);

        var callbackArgs = [];
        for (var i = 0; i < moduleObj.deps.length; i++) {
            var depName = moduleObj.deps[i];
            if (moduleResolved(depName)) {
                callbackArgs.push(moduleTable[depName].val);
            } else {
                throw new Error("Module " + depName + " not yet resolved");
            }
        }

        if (moduleObj.val != null) {
            throw new Error("Already evaluated " + moduleObj.name);
        }
        // Now call it
        moduleObj.val = moduleObj.callback.apply(null, callbackArgs);
        moduleObj.resolved = true;
    }

    define = function(name, deps, callback) {
        //This module might have no dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        console.log("define(" + name + ", [" + deps + "])");
        if (name in moduleTable) {
            throw new Error("Module " + name + " already defined");
        }

        moduleTable[name] = {
            callback: callback,
            name: name,
            deps: deps,
            val: null,

            // Since module functions might return weird values like undefined
            // we separately keep track of whether we've resolved it or not.
            resolved: false,
        };
    };

    function getLoadOrder(deps) {
        // Do DFS + topsort in one pass over the graph without destroying it
        var topsorted = [];

        var toVisit = {}; // Nodes we haven't touched
        var currentlyVisitedNodes = {}; // Nodes we're currently working on (used to find cycles)
        var visitedNodes = {}; // Nodes we're done with

        function visitNode(node) {
            console.log("Visiting " + node);
            if (!(node in moduleTable)) {
                throw new Error("Unknown module : " + depName);
            }
            if (node in currentlyVisitedNodes) {
                throw new Error("We have a cycle, which includes " + node);
            }
            if (node in visitedNodes) {
                // already visited it
                return;
            }

            // It's unvisited, so mark it as currently being visited
            currentlyVisitedNodes[node] = true;
            if (node in toVisit) {
                delete toVisit[node];
            }

            // Now visit its children
            for (var i = 0; i < moduleTable[node].deps.length; i++) {
                var child = moduleTable[node].deps[i];
                visitNode(child);
            }

            // Now all of node's dependencies have been added to the list
            // so we're safe to add it
            topsorted.push(node);
            delete currentlyVisitedNodes[node];
            visitedNodes[node] = true;
        };

        for (var i = 0; i < deps.length; i++) {
            toVisit[deps[i]] = true;
        }

        while (Object.keys(toVisit).length > 0) {
            var node = Object.keys(toVisit)[0];
            visitNode(node);
        }

        return topsorted;
    }

    myrequire = function(deps, callback) {
        var loadOrder = getLoadOrder(deps);
        console.log("The load order is ...\n" + JSON.stringify(loadOrder, null, 2));

        for (var i = 0; i < loadOrder.length; i++) {
            var modName = loadOrder[i];
            if (!moduleTable[modName].resolved) {
                evaluateModuleFn(moduleTable[modName]);
            }
        }
    };
}());


define("a", ["b", "c"],
       function (bval, cval) {
           console.log("bval is " + bval);
           console.log("cval is " + cval);
       });
define("b", ["d"], function (cval) {
    console.log(cval);
    return "bval";
});
define("c", [], function () {return "mc";});
define("d", [], function() {});
define("e", ["d"], function() {});
myrequire(["a", "c", "e"], function () {console.log("in main!");});
