import kind from '$lib/utils/kind';

function consoleArgs(args: any[]): Array<{ type: string; content: any }> {
  return args.map((arg) => {
    switch (kind(arg)) {
      case 'window':
      case 'function':
      case 'date':
      case 'symbol':
        return { type: kind(arg), content: arg.toString() };
      case 'document':
        return { type: kind(arg), content: arg.documentElement.outerHTML };
      case 'element':
        return { type: kind(arg), content: arg.outerHTML };
      case 'node':
        return { type: kind(arg), content: arg.textContent };
      case 'nodelist':
      case 'htmlcollection':
        return {
          type: kind(arg),
          content: [...arg].map((x: unknown) => consoleArgs([x])[0].content),
        };
      case 'array':
        return { type: kind(arg), content: arg.map((x: unknown) => consoleArgs([x])[0].content) };
      case 'object':
      case 'event':
        const obj: Record<string, any> = {};
        // eslint-disable-next-line guard-for-in
        for (const k in arg) {
          obj[k] = arg[k];
        }
        return {
          type: kind(arg),
          content: Object.keys(obj).reduce(
            (acc, key) => ({ ...acc, [key]: consoleArgs([obj[key]])[0].content }),
            {},
          ),
        };
    //   case 'error':
    //     return {
    //       type: typeOf(arg),
    //       content: arg.constructor.name + ': ' + arg.message,
    //     };
    }
    return { type: 'other', content: arg };
    // try {
    //   return { type: 'other', content: structuredClone(arg) };
    // } catch {
    //   return { type: 'other', content: String(arg) };
    // }
  });
}

// Worker console interception  
const proxyConsole = () => {  
  const originalConsole = { ...console };  

  // Create proxy for console  
  self.console = new Proxy(originalConsole, {  
    get(target, method) {  
      return function(...args) {  
        // Call original console method  
        if (method in target) {  
          target[method](...args);  
        } 

        // Send to main thread  
        self.postMessage({  
          type: 'console',  
          method: method,  
        //   args: args,
          args: consoleArgs(args, 0),
        });  
      };  
    }  
  });  
};  

// Initialize console proxy in worker  
proxyConsole();

console.log(kind(proxyConsole));
console.log(proxyConsole);
console.log('Worker console initialized', undefined, null, 123, 'hello', { a: 1 }, [1, 2, 3], new Date("2023-01-01"), new Error("Test error"));
console.info('This is an info message');
console.warn('This is a warning message');
console.error('This is an error message');
console.log(kind(self))
throw new Error('This is a test error thrown in the worker');
// throw new undefined; // This will cause an error in the worker
