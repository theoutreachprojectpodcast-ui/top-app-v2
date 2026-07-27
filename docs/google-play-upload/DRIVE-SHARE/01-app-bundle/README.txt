AAB NOT STORED IN GIT
=====================
The signed App Bundle is gitignored (large + regenerable).

Build it locally after obtaining the upload keystore from the team vault:

  pnpm run mobile:store:prep
  pnpm run mobile:android:bundle

Expected output:
  web/android/app/build/outputs/bundle/release/app-release.aab

Then either upload that path to Play Console, or run:

  python web/scripts/assemble-google-play-drive-pack.py

to copy a dated AAB into this folder for local/Drive handoff.

See ../06-ENGINEER-FROM-SOURCE.txt
