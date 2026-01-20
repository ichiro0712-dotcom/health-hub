package com.healthhub.app;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

public class PermissionsRationaleActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String action = getIntent().getAction();
        if ("android.intent.action.VIEW_PERMISSION_USAGE".equals(action)) {
            // Health Connect requires solving this intent to show privacy policy or usage.
            // We explain that this app needs health data.
            new androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Health Data Access")
                .setMessage("Health Hub requires access to your health data to synchronize steps, sleep, and vitals. Please grant permissions in the following screen.")
                .setPositiveButton("OK", (dialog, which) -> finish())
                .show();
            return;
        }

        // For ACTION_SHOW_PERMISSIONS_RATIONALE
        new androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Permissions Required")
            .setMessage("We need health permissions to function. Please allow them.")
            .setPositiveButton("OK", (dialog, which) -> finish())
            .show();
    }
}
