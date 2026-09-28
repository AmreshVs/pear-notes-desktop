#!/bin/sh
export TMPDIR="$XDG_RUNTIME_DIR/app/$FLATPAK_ID"
export CHROME_DESKTOP=io.github.amreshvs.PearNotes.desktop
exec zypak-wrapper /app/pear-notes/PearNotes "$@"
