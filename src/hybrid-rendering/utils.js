function doubleToBits(f) {
    return new Uint32Array(Float64Array.of(f).buffer);
}

export default class HybridRenderingUtils {
    static doublesToCamMsg(...args) {
        let arrayLength = 0;
        args.forEach((arg) => {
            if (typeof arg === 'number') {
                arrayLength += 2;
            }
        });

        const msg = new Uint32Array(arrayLength);
        let i = 0;
        args.forEach((arg) => {
            if (typeof arg === 'number') {
                const bits = doubleToBits(arg);
                [msg[i], msg[i + 1]] = bits;
                i += 2;
            }
        });

        return msg;
    }
}
