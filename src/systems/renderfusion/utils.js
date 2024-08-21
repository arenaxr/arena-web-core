const FLOAT64_BYTE_SIZE = 8;      // A double (float64) takes 8 bytes (64 bits)
const UINT32_BYTE_SIZE = 4;       // A Uint32 takes 4 bytes (32 bits)
const ELEMENT_COUNT = 16;         // Number of elements in the camera pose matrix
const UINT32_PER_FLOAT64 = 2;     // Each float64 corresponds to 2 Uint32 values
const TOTAL_UINT32_COUNT = ELEMENT_COUNT * UINT32_PER_FLOAT64 + UINT32_PER_FLOAT64; // Total Uint32 slots needed

export default class RenderFusionUtils {
    static doubleToUint32Array(double) {
        const buffer = new ArrayBuffer(FLOAT64_BYTE_SIZE);
        const view = new DataView(buffer);

        view.setFloat64(0, double, true); // true for little-endian

        // Extract the two 32-bit parts
        const low = view.getUint32(0, true);
        const high = view.getUint32(UINT32_BYTE_SIZE, true);

        return [low, high];
    }

    static packPoseMsg(array16, doubleValue) {
        const packedArray = new Uint32Array(TOTAL_UINT32_COUNT);

        for (let i = 0; i < ELEMENT_COUNT; i++) {
            const [low, high] = RenderFusionUtils.doubleToUint32Array(array16[i]);
            packedArray[i * UINT32_PER_FLOAT64] = low;
            packedArray[i * UINT32_PER_FLOAT64 + 1] = high;
        }

        const [low, high] = RenderFusionUtils.doubleToUint32Array(doubleValue);
        packedArray[ELEMENT_COUNT * UINT32_PER_FLOAT64] = low;
        packedArray[ELEMENT_COUNT * UINT32_PER_FLOAT64 + 1] = high;

        return packedArray;
    }
}

/* function doubleToBits(f) {
 *     return new Uint32Array(Float64Array.of(f).buffer);
 * }
 *
 *     static doublesToCamMsg(...args) {
 *         let arrayLength = 0;
 *         args.forEach((arg) => {
 *             if (typeof arg === 'number') {
 *                 arrayLength += 2;
 *             }
 *         });
 *
 *         const msg = new Uint32Array(arrayLength);
 *         let i = 0;
 *         args.forEach((arg) => {
 *             if (typeof arg === 'number') {
 *                 const bits = doubleToBits(arg);
 *                 [msg[i], msg[i + 1]] = bits;
 *                 i += 2;
 *             }
 *         });
 *
 *         return msg;
 *     } */
