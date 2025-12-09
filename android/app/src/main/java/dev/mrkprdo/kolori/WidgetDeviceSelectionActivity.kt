package dev.mrkprdo.kolori

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONArray
import org.json.JSONObject

/**
 * Activity to select a device for the Kolori Widget
 * Launched by the widget configuration when user adds a new widget
 */
class WidgetDeviceSelectionActivity : AppCompatActivity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    companion object {
        private const val TAG = "WidgetDeviceSelection"
        const val ACTION_SELECT_DEVICE = "dev.mrkprdo.kolori.ACTION_SELECT_DEVICE_FOR_WIDGET"
    }

    data class DeviceInfo(
        val id: Int,
        val name: String,
        val ip: String,
        val isConnected: Boolean
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Set result to CANCELED initially
        setResult(Activity.RESULT_CANCELED)

        // Get widget ID from intent
        appWidgetId = intent?.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        Log.d(TAG, "Widget device selection for widgetId: $appWidgetId")

        // Set window properties for dialog appearance
        window?.setLayout(
            (resources.displayMetrics.widthPixels * 0.9).toInt(),
            ViewGroup.LayoutParams.WRAP_CONTENT
        )

        // Read devices from AsyncStorage
        val devices = readDevicesFromAsyncStorage()

        if (devices.isEmpty()) {
            Toast.makeText(
                this,
                "No devices found. Please add devices in the Kolori app first.",
                Toast.LENGTH_LONG
            ).show()
            finish()
            return
        }

        // Create a simple list view
        setupDeviceListView(devices)
    }

    private fun setupDeviceListView(devices: List<DeviceInfo>) {
        // Create a vertical linear layout to hold title and list
        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(48, 48, 48, 48)
        }

        // Add title
        val title = TextView(this).apply {
            text = "Select Device for Widget"
            textSize = 20f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setPadding(0, 0, 0, 32)
        }
        container.addView(title)

        // Create list view
        val listView = ListView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        val adapter = object : ArrayAdapter<DeviceInfo>(
            this,
            android.R.layout.simple_list_item_2,
            android.R.id.text1,
            devices
        ) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val view = super.getView(position, convertView, parent)
                val device = getItem(position)

                val text1 = view.findViewById<TextView>(android.R.id.text1)
                val text2 = view.findViewById<TextView>(android.R.id.text2)

                text1.text = device?.name ?: "Unknown"
                text2.text = "${device?.ip ?: ""} ${if (device?.isConnected == true) "●" else "○"}"

                return view
            }
        }

        listView.adapter = adapter
        listView.setOnItemClickListener { _, _, position, _ ->
            val selectedDevice = devices[position]
            returnDeviceSelection(selectedDevice)
        }

        container.addView(listView)
        setContentView(container)
    }

    private fun readDevicesFromAsyncStorage(): List<DeviceInfo> {
        val devices = mutableListOf<DeviceInfo>()

        try {
            // AsyncStorage uses SQLite database "RKStorage"
            val db = openOrCreateDatabase("RKStorage", Context.MODE_PRIVATE, null)

            val cursor = db.rawQuery("SELECT key, value FROM catalystLocalStorage WHERE key = ?", arrayOf("kolori_devices"))

            if (cursor.moveToFirst()) {
                val devicesJson = cursor.getString(cursor.getColumnIndexOrThrow("value"))
                Log.d(TAG, "Found devices in RKStorage database")
                // Avoid logging full device data in production
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "Devices JSON: $devicesJson")
                }
                if (!devicesJson.isNullOrEmpty()) {
                    val jsonArray = JSONArray(devicesJson)

                for (i in 0 until jsonArray.length()) {
                    val deviceObj = jsonArray.getJSONObject(i)

                    val id = deviceObj.optInt("id", 0)
                    val name = deviceObj.optString("name", "Unknown")
                    val ip = deviceObj.optString("ip", "")
                    val isConnected = deviceObj.optBoolean("isConnected", false)

                    if (ip.isNotEmpty()) {
                        devices.add(DeviceInfo(id, name, ip, isConnected))
                    }
                }

                Log.d(TAG, "Found ${devices.size} devices")
            }
        }

        cursor.close()
        db.close()

    } catch (e: Exception) {
        Log.e(TAG, "Error reading devices from AsyncStorage", e)
    }

    return devices
}

private fun returnDeviceSelection(device: DeviceInfo) {
    Log.d(TAG, "Selected device: ${device.name} (${device.ip})")

    val resultIntent = Intent().apply {
        putExtra("device_id", device.id)
        putExtra("device_name", device.name)
        putExtra("device_ip", device.ip)
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
    }
    setResult(Activity.RESULT_OK, resultIntent)

    Toast.makeText(this, "Device selected: ${device.name}", Toast.LENGTH_SHORT).show()

    finish()
}
}