package com.nexxo.enterprise;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            WebSettings settings = webView.getSettings();

            // 1. Google OAuth blocks Android WebViews if User-Agent contains '; wv' or 'Version/4.0'.
            // Stripping these substrings allows Google Account Chooser & sign-in directly inside the app.
            String ua = settings.getUserAgentString();
            if (ua != null) {
                String cleanUa = ua.replace("; wv", "")
                                   .replace("; wv;", ";")
                                   .replace("Version/4.0 ", "");
                settings.setUserAgentString(cleanUa);
            }

            // 2. Enable DOM storage, database, and window scripting for Google OAuth
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setSupportMultipleWindows(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);

            // 3. Ensure Cookies are preserved across OAuth redirects
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }
    }
}
