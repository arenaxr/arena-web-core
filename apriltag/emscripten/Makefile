# do not compile pywarp and some tag families that take a long time to compile
APRILTAG_SRCS := $(shell ls apriltag/*.c apriltag/common/*.c | grep -v -e apriltag_pywrap.c -e tagCircle49h12.c -e tagCustom48h12.c -e tagStandard52h13.c)

apriltag.js: $(APRILTAG_SRCS) apriltag_js.c
	emcc -Os -s MODULARIZE=1 -s 'EXPORT_NAME="AprilTagWasm"' -s WASM=1 -Iapriltag -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_FUNCTIONS="['_free']" -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap", "getValue", "setValue"]' -o $@ $^
	cp $@ ../apritag_wasm.js
	cp apriltag.wasm ../apriltag.wasm

clean:
	rm *js *wasm
