package com.trustpay.ke;

import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.os.Handler;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.RelativeLayout;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private static final String WEBSITE_URL = "https://trustpay.co.ke/";
    private static final int SPLASH_DELAY = 2000;

    private WebView webView;
    private RelativeLayout splashLayout;
    private RelativeLayout noInternetLayout;
    private Button retryButton;
    private ConnectivityManager connectivityManager;
    private NetworkCallback networkCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        setupWebView();
        setupNetworkMonitoring();
        checkConnectionAndLoad();
    }

    private void initViews() {
        webView = findViewById(R.id.webView);
        splashLayout = findViewById(R.id.splashLayout);
        noInternetLayout = findViewById(R.id.noInternetLayout);
        retryButton = findViewById(R.id.retryButton);
        
        retryButton.setOnClickListener(v -> checkConnectionAndLoad());
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        
        // Enable JavaScript
        webSettings.setJavaScriptEnabled(true);
        
        // Disable zoom controls
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setSupportZoom(false);
        
        // Disable external browser navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
            }
        });

        // Handle JavaScript alerts
        webView.setWebChromeClient(new WebChromeClient());
        
        // Enable DOM storage
        webSettings.setDomStorageEnabled(true);
        
        // Enable local storage
        webSettings.setDatabaseEnabled(true);
        
        // Cache settings
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // Allow file access
        webSettings.setAllowFileAccess(true);
        
        // Allow content access
        webSettings.setAllowContentAccess(true);
    }

    private void setupNetworkMonitoring() {
        connectivityManager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        
        networkCallback = new NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                runOnUiThread(() -> {
                    if (webView.getVisibility() == View.GONE && noInternetLayout.getVisibility() == View.VISIBLE) {
                        loadWebsite();
                    }
                });
            }

            @Override
            public void onLost(Network network) {
                runOnUiThread(() -> showNoInternet());
            }
        };

        NetworkRequest request = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
        connectivityManager.registerNetworkCallback(request, networkCallback);
    }

    private void checkConnectionAndLoad() {
        Network network = connectivityManager.getActiveNetwork();
        NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(network);
        
        if (capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
            loadWebsite();
        } else {
            showNoInternet();
        }
    }

    private void loadWebsite() {
        noInternetLayout.setVisibility(View.GONE);
        
        // Show splash screen first
        splashLayout.setVisibility(View.VISIBLE);
        webView.setVisibility(View.GONE);

        // Delay to show splash screen
        new Handler().postDelayed(() -> {
            splashLayout.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
            webView.loadUrl(WEBSITE_URL);
        }, SPLASH_DELAY);
    }

    private void showNoInternet() {
        splashLayout.setVisibility(View.GONE);
        webView.setVisibility(View.GONE);
        noInternetLayout.setVisibility(View.VISIBLE);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (connectivityManager != null && networkCallback != null) {
            connectivityManager.unregisterNetworkCallback(networkCallback);
        }
    }
}
