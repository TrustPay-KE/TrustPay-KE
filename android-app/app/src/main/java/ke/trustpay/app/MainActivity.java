package ke.trustpay.app;

import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends AppCompatActivity {

    private static final String WEBSITE_URL = "https://trustpay.co.ke/";
    private static final int SPLASH_DELAY = 3000;

    private WebView webView;
    private RelativeLayout splashLayout;
    private RelativeLayout noInternetLayout;
    private Button retryButton;
    private ImageView splashLogo;
    private TextView splashTitle;
    private TextView splashTagline;
    private View pulseRing;
    private ConnectivityManager connectivityManager;
    private NetworkCallback networkCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable fullscreen
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        
        // Hide system bars for immersive mode
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        setContentView(R.layout.activity_main);
        
        // Setup immersive fullscreen
        setupFullscreen();
        
        initViews();
        setupWebView();
        setupNetworkMonitoring();
        checkConnectionAndLoad();
    }
    
    private void setupFullscreen() {
        WindowInsetsControllerCompat windowInsetsController = 
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        windowInsetsController.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars());
    }

    private void initViews() {
        webView = findViewById(R.id.webView);
        splashLayout = findViewById(R.id.splashLayout);
        noInternetLayout = findViewById(R.id.noInternetLayout);
        retryButton = findViewById(R.id.retryButton);
        splashLogo = findViewById(R.id.splashLogo);
        splashTitle = findViewById(R.id.splashTitle);
        splashTagline = findViewById(R.id.splashTagline);
        pulseRing = findViewById(R.id.pulseRing);
        
        retryButton.setOnClickListener(v -> checkConnectionAndLoad());
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        
        // Enable JavaScript
        webSettings.setJavaScriptEnabled(true);
        
        // Disable zoom completely
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setSupportZoom(false);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        
        // Disable file access from web
        webSettings.setAllowFileAccess(false);
        webSettings.setAllowContentAccess(false);
        webSettings.setAllowFileAccessFromFileURLs(false);
        webSettings.setAllowUniversalAccessFromFileURLs(false);
        
        // Enable DOM and database storage
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        
        // Cache
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // Mixed content
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        
        // Custom WebViewClient to prevent external navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Only allow URLs from our domain
                if (url != null && (url.startsWith("https://trustpay.co.ke/") || 
                    url.startsWith("https://www.trustpay.co.ke/"))) {
                    return false;
                }
                // Open external links in default browser
                return true;
            }
            
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
            }
        });

        // Custom ChromeClient - no popup windows
        webView.setWebChromeClient(new WebChromeClient());
        
        // Enable viewport
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);
        
        // Set scrollbar style
        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
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

        // Start splash animations
        startSplashAnimations();

        // Delay to show splash screen with animations
        new Handler().postDelayed(() -> {
            // Fade out splash
            splashLayout.animate()
                .alpha(0)
                .setDuration(300)
                .withEndAction(() -> {
                    splashLayout.setVisibility(View.GONE);
                    splashLayout.setAlpha(1);
                    webView.setVisibility(View.VISIBLE);
                    webView.loadUrl(WEBSITE_URL);
                })
                .start();
        }, SPLASH_DELAY);
    }

    private void startSplashAnimations() {
        // Reset alpha
        splashLogo.setAlpha(0f);
        splashTitle.setAlpha(0f);
        splashTagline.setAlpha(0f);
        pulseRing.setAlpha(0f);
        
        // Reset scales
        splashLogo.setScaleX(0.5f);
        splashLogo.setScaleY(0.5f);
        splashTitle.setScaleX(0.5f);
        splashTitle.setScaleY(0.5f);

        // Logo bounce in animation
        splashLogo.animate()
            .alpha(1f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(500)
            .setInterpolator(new AccelerateDecelerateInterpolator())
            .start();

        // Pulse ring animation
        pulseRing.postDelayed(() -> {
            pulseRing.animate()
                .alpha(0.6f)
                .scaleX(1.2f)
                .scaleY(1.2f)
                .setDuration(600)
                .withEndAction(() -> {
                    pulseRing.animate()
                        .alpha(0f)
                        .scaleX(1.5f)
                        .scaleY(1.5f)
                        .setDuration(600)
                        .start();
                })
                .start();
        }, 400);

        // Title fade in and scale up (with "TrustPay" written below)
        splashTitle.postDelayed(() -> {
            splashTitle.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(400)
                .setInterpolator(new AccelerateDecelerateInterpolator())
                .start();
        }, 600);

        // Tagline fade in
        splashTagline.postDelayed(() -> {
            splashTagline.animate()
                .alpha(1f)
                .setDuration(400)
                .start();
        }, 900);

        // Progress bar fade in
        findViewById(R.id.splashProgress).postDelayed(() -> {
            findViewById(R.id.splashProgress).animate()
                .alpha(1f)
                .setDuration(300)
                .start();
        }, 1100);
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
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (Exception e) {
                // Ignore
            }
        }
    }
}
