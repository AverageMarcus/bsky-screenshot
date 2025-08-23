function bindIt(obj, base = '', withFuncs = {}, onUpdate = ()=>{}) {
  let arrayHandler = {
    apply: function (fn, arr, argumentsList) {
      obj[prop]._push(argumentsList);
      triggerUpdate(bindKey, obj[prop]);
    }
  };

  for (let key in obj) {
    // Make sure all child objects are proxied too
    if (obj.hasOwnProperty(key) && Object.prototype.toString.call(obj[key]) === '[object Object]') {
      obj[key] = bindIt(obj[key], `${base ? base + '.' : ''}${key}`, withFuncs, onUpdate);
    }
    // ...as well as arrays
    if (obj.hasOwnProperty(key) && Object.prototype.toString.call(obj[key]) === '[object Array]') {
      obj[key] = new Proxy(obj[key], arrayHander);
    }
  }

  function wrapArray(obj, prop, bindKey) {
    if (Object.prototype.toString.call(obj[prop]) === '[object Array]') {
      obj[prop]._push = obj[prop].push;
      obj[prop].push = new Proxy(obj[prop].push, arrayHandler);
    }
  }

  function triggerUpdate(bindKey, value) {
    let elements = document.querySelectorAll(`[bind-it-to='${bindKey}']`);
    requestAnimationFrame(() => {
      for (let element of elements) {
        let bindType = element.getAttribute('bind-it-with') || 'innerText';
        switch (bindType) {
          case 'innerText':
            element.innerText = value;
            break;
          case 'innerHTML':
            element.innerHTML = value;
            break;
          case 'value':
            element.value = value;
            break;
          case 'checked':
            element.checked = value;
            break;
          case 'visible':
            if (value == false || value == "") {
              element.style.display = 'none';
            } else {
              element.style.display = '';
            }
            break;
          default:
            if (typeof withFuncs[bindType] === 'function') {
              withFuncs[bindType].apply(element, [value]);
            } else if (typeof window[bindType] === 'function') {
              window[bindType].apply(element, [value]);
            }
            break;
        }
      }
      if (onUpdate !== undefined) {
        requestAnimationFrame(() => {
          onUpdate(bindKey, value);
        });
      }
    });
  }

  let handler = {
    get: function (obj, key) {
      if (typeof key === 'string') {
        // Ensure safe deep get/set (no need to set up the structute)
        if (obj[key] === undefined) obj[key] = bindIt({}, `${base ? base + '.' : ''}${key}`, withFuncs, onUpdate);
        return obj[key];
      }
    },

    set: function (obj, prop, value) {
      const bindKey = `${base ? base + '.' : ''}${prop}`;
      // Set the new value
      obj[prop] = value;
      // Handle arrays
      wrapArray(obj, prop, bindKey);
      // Handle bindings
      triggerUpdate(bindKey, obj[prop]);
      return obj;
    }
  };

  let proxied = new Proxy(obj, handler);

  // Handle two-way and initial bind
  if (base === '') {
    let elements = document.querySelectorAll(`[bind-it-to]`);
    for (let element of elements) {
      let key = element.getAttribute('bind-it-to');
      let keyParts = key.split('.');
      let wantedValue = obj;
      while (keyParts.length) {
        wantedValue = wantedValue[keyParts.splice(0, 1)];
      }
      triggerUpdate(key, wantedValue);
    }

    let twoWayElements = document.querySelectorAll(`[bind-it-two-way]`);
    const setObjPath = (t, path, value) => {
      if (typeof t != "object") throw Error("non-object")
      if (path == "") throw Error("empty path")
      const pos = path.indexOf(".")
      return pos == -1
        ? (t[path] = value, value)
        : setObjPath(t[path.slice(0, pos)], path.slice(pos + 1), value)
    }
    for (let element of twoWayElements) {
      element.addEventListener('change', function () {
        let prop = this.getAttribute('bind-it-to');
        let bindType = this.getAttribute('bind-it-with') || 'value';

        switch (bindType) {
          case 'innerText':
            setObjPath(proxied, prop, this.innerText);
            break;
          case 'innerHTML':
            setObjPath(proxied, prop, this.innerHTML);
            break;
          case 'checked':
            setObjPath(proxied, prop, this.checked);
            break;
          default:
            setObjPath(proxied, prop, this.value);
            break;
        }
      });
    }
  }

  return proxied;
}
