package org.theoutreachproject.top;

import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * Portrait-only Capacitor shell. Manifest screenOrientation=portrait is primary;
 * this re-applies the lock after resume / focus / config changes so plugins cannot
 * leave SCREEN_ORIENTATION_UNSPECIFIED (e.g. ScreenOrientation.unlock).
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GooglePlayExternalContentLinksPlugin.class);
        lockPortrait();
        super.onCreate(savedInstanceState);
        lockPortrait();
    }

    @Override
    public void onStart() {
        super.onStart();
        lockPortrait();
    }

    @Override
    public void onResume() {
        super.onResume();
        lockPortrait();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            lockPortrait();
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        lockPortrait();
    }

    private void lockPortrait() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
    }
}
