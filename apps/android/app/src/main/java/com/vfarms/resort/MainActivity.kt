package com.vfarms.resort

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.vfarms.resort.ui.VFarmsRoot
import com.vfarms.resort.ui.theme.VFarmsTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            VFarmsTheme {
                VFarmsRoot()
            }
        }
    }
}
