package org.theoutreachproject.top;

import android.app.Activity;
import android.net.Uri;
import android.util.Log;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingProgramAvailabilityDetails;
import com.android.billingclient.api.BillingProgramAvailabilityListener;
import com.android.billingclient.api.BillingProgramReportingDetails;
import com.android.billingclient.api.BillingProgramReportingDetailsListener;
import com.android.billingclient.api.BillingProgramReportingDetailsParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.EnableBillingProgramParams;
import com.android.billingclient.api.LaunchExternalLinkParams;
import com.android.billingclient.api.LaunchExternalLinkResponseListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;

/**
 * Capacitor bridge for Google Play's United States External Content Links program.
 *
 * A fresh external transaction token is generated for every checkout attempt. Google Play then
 * displays the required information screen and launches the approved TOP-owned handoff URL in an
 * external browser. Stripe itself is never opened directly from the Android WebView.
 */
@CapacitorPlugin(name = "GooglePlayExternalContentLinks")
public class GooglePlayExternalContentLinksPlugin extends Plugin {
    private static final String TAG = "TOPGooglePlayECL";
    private static final String APPROVED_HOST = "theoutreachproject.app";
    private static final String APPROVED_PATH = "/api/billing/google-play-external-checkout";
    private static final int MAX_TOKEN_LENGTH = 6000;
    private static final int MAX_URL_LENGTH = 4096;

    private interface ConnectedAction {
        void run(BillingClient billingClient, Activity activity);
    }

    @PluginMethod
    public void prepare(PluginCall call) {
        withConnectedClient(call, new ConnectedAction() {
            @Override
            public void run(final BillingClient billingClient, Activity activity) {
                billingClient.isBillingProgramAvailableAsync(
                    BillingClient.BillingProgram.EXTERNAL_CONTENT_LINK,
                    new BillingProgramAvailabilityListener() {
                        @Override
                        public void onBillingProgramAvailabilityResponse(
                            BillingResult billingResult,
                            BillingProgramAvailabilityDetails availabilityDetails
                        ) {
                            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                                endQuietly(billingClient);
                                rejectBilling(call, "eligibility", billingResult);
                                return;
                            }

                            BillingProgramReportingDetailsParams params =
                                BillingProgramReportingDetailsParams.newBuilder()
                                    .setBillingProgram(BillingClient.BillingProgram.EXTERNAL_CONTENT_LINK)
                                    .build();

                            billingClient.createBillingProgramReportingDetailsAsync(
                                params,
                                new BillingProgramReportingDetailsListener() {
                                    @Override
                                    public void onCreateBillingProgramReportingDetailsResponse(
                                        BillingResult tokenResult,
                                        BillingProgramReportingDetails reportingDetails
                                    ) {
                                        endQuietly(billingClient);
                                        if (tokenResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                                            rejectBilling(call, "token", tokenResult);
                                            return;
                                        }

                                        String token = reportingDetails == null
                                            ? ""
                                            : safeTrim(reportingDetails.getExternalTransactionToken());
                                        if (token.isEmpty() || token.length() > MAX_TOKEN_LENGTH) {
                                            call.reject(
                                                "Google Play did not return a valid external checkout token. Please try again.",
                                                "GOOGLE_PLAY_ECL_INVALID_TOKEN"
                                            );
                                            return;
                                        }

                                        JSObject result = new JSObject();
                                        result.put("externalTransactionToken", token);
                                        result.put("billingProgram", "EXTERNAL_CONTENT_LINK");
                                        call.resolve(result);
                                    }
                                }
                            );
                        }
                    }
                );
            }
        });
    }

    @PluginMethod
    public void launch(PluginCall call) {
        final String url = safeTrim(call.getString("url"));
        final String externalTransactionToken = safeTrim(call.getString("externalTransactionToken"));

        if (externalTransactionToken.isEmpty() || externalTransactionToken.length() > MAX_TOKEN_LENGTH) {
            call.reject(
                "A fresh Google Play external checkout token is required.",
                "GOOGLE_PLAY_ECL_MISSING_TOKEN"
            );
            return;
        }

        final Uri uri = approvedUri(url);
        if (uri == null) {
            call.reject(
                "The checkout destination is not an approved Outreach Project website link.",
                "GOOGLE_PLAY_ECL_INVALID_DESTINATION"
            );
            return;
        }

        withConnectedClient(call, new ConnectedAction() {
            @Override
            public void run(final BillingClient billingClient, final Activity activity) {
                billingClient.isBillingProgramAvailableAsync(
                    BillingClient.BillingProgram.EXTERNAL_CONTENT_LINK,
                    new BillingProgramAvailabilityListener() {
                        @Override
                        public void onBillingProgramAvailabilityResponse(
                            BillingResult billingResult,
                            BillingProgramAvailabilityDetails availabilityDetails
                        ) {
                            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                                endQuietly(billingClient);
                                rejectBilling(call, "eligibility", billingResult);
                                return;
                            }

                            LaunchExternalLinkParams params = LaunchExternalLinkParams.newBuilder()
                                .setBillingProgram(BillingClient.BillingProgram.EXTERNAL_CONTENT_LINK)
                                .setExternalTransactionToken(externalTransactionToken)
                                .setLinkUri(uri)
                                .setLinkType(LaunchExternalLinkParams.LinkType.LINK_TO_DIGITAL_CONTENT_OFFER)
                                .setLaunchMode(LaunchExternalLinkParams.LaunchMode.LAUNCH_IN_EXTERNAL_BROWSER_OR_APP)
                                .build();

                            billingClient.launchExternalLink(
                                activity,
                                params,
                                new LaunchExternalLinkResponseListener() {
                                    @Override
                                    public void onLaunchExternalLinkResponse(BillingResult launchResult) {
                                        endQuietly(billingClient);
                                        if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                                            rejectBilling(call, "launch", launchResult);
                                            return;
                                        }

                                        JSObject result = new JSObject();
                                        result.put("launched", true);
                                        call.resolve(result);
                                    }
                                }
                            );
                        }
                    }
                );
            }
        });
    }

    private void withConnectedClient(final PluginCall call, final ConnectedAction action) {
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("The Android checkout activity is unavailable.", "GOOGLE_PLAY_ECL_NO_ACTIVITY");
            return;
        }

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final BillingClient billingClient;
                try {
                    EnableBillingProgramParams enableParams = EnableBillingProgramParams.newBuilder()
                        .setBillingProgram(BillingClient.BillingProgram.EXTERNAL_CONTENT_LINK)
                        .build();

                    billingClient = BillingClient.newBuilder(getContext())
                        .enableBillingProgram(enableParams)
                        .enableAutoServiceReconnection()
                        .build();
                } catch (Exception error) {
                    Log.e(TAG, "Could not initialize Play Billing", error);
                    call.reject(
                        "Google Play checkout could not be initialized. Please update Google Play and try again.",
                        "GOOGLE_PLAY_ECL_INIT_FAILED"
                    );
                    return;
                }

                billingClient.startConnection(new BillingClientStateListener() {
                    @Override
                    public void onBillingSetupFinished(BillingResult billingResult) {
                        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                            endQuietly(billingClient);
                            rejectBilling(call, "connection", billingResult);
                            return;
                        }
                        action.run(billingClient, activity);
                    }

                    @Override
                    public void onBillingServiceDisconnected() {
                        Log.w(TAG, "Google Play Billing service disconnected");
                    }
                });
            }
        });
    }

    private Uri approvedUri(String rawUrl) {
        if (rawUrl == null || rawUrl.isEmpty() || rawUrl.length() > MAX_URL_LENGTH) return null;
        try {
            Uri uri = Uri.parse(rawUrl);
            String scheme = safeTrim(uri.getScheme()).toLowerCase(Locale.US);
            String host = safeTrim(uri.getHost()).toLowerCase(Locale.US);
            String path = safeTrim(uri.getPath());
            boolean approvedHost = APPROVED_HOST.equals(host) || host.endsWith("." + APPROVED_HOST);
            if (!"https".equals(scheme) || !approvedHost || !APPROVED_PATH.equals(path)) return null;
            return uri;
        } catch (Exception ignored) {
            return null;
        }
    }

    private void rejectBilling(PluginCall call, String stage, BillingResult billingResult) {
        int responseCode = billingResult == null
            ? BillingClient.BillingResponseCode.ERROR
            : billingResult.getResponseCode();
        String debugMessage = billingResult == null ? "" : safeTrim(billingResult.getDebugMessage());
        Log.w(TAG, "External content link " + stage + " failed: " + responseCode + " " + debugMessage);

        String code;
        String message;
        switch (responseCode) {
            case BillingClient.BillingResponseCode.BILLING_UNAVAILABLE:
                code = "GOOGLE_PLAY_ECL_BILLING_UNAVAILABLE";
                message = "Google Play has not enabled external checkout for this account or device. Confirm External content links enrollment and United States eligibility.";
                break;
            case BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED:
                code = "GOOGLE_PLAY_ECL_NOT_SUPPORTED";
                message = "This version of Google Play does not support external checkout. Update the Play Store and try again.";
                break;
            case BillingClient.BillingResponseCode.USER_CANCELED:
                code = "GOOGLE_PLAY_ECL_CANCELED";
                message = "Checkout was canceled before the browser opened.";
                break;
            case BillingClient.BillingResponseCode.NETWORK_ERROR:
            case BillingClient.BillingResponseCode.SERVICE_DISCONNECTED:
            case BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE:
                code = "GOOGLE_PLAY_ECL_TEMPORARY_ERROR";
                message = "Google Play could not be reached. Check your connection and try again.";
                break;
            case BillingClient.BillingResponseCode.DEVELOPER_ERROR:
                code = "GOOGLE_PLAY_ECL_CONFIGURATION_ERROR";
                message = "Google Play rejected the external checkout configuration. Please contact The Outreach Project support.";
                break;
            default:
                code = "GOOGLE_PLAY_ECL_ERROR";
                message = "Google Play could not authorize this external checkout. Please try again.";
                break;
        }
        call.reject(message, code);
    }

    private static String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private static void endQuietly(BillingClient billingClient) {
        if (billingClient == null) return;
        try {
            billingClient.endConnection();
        } catch (Exception ignored) {
            // Best-effort cleanup only.
        }
    }
}
