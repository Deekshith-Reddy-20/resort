package com.vfarms.resort.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Forest = Color(0xFF123D2D)
private val Evergreen = Color(0xFF09281F)
private val Ivory = Color(0xFFF8F5ED)
private val Dragon = Color(0xFFD93668)
private val Stone = Color(0xFFD9D2C4)

private val colors = lightColorScheme(
    primary = Forest,
    onPrimary = Ivory,
    secondary = Dragon,
    onSecondary = Color.White,
    background = Ivory,
    onBackground = Evergreen,
    surface = Color.White,
    onSurface = Evergreen,
    outline = Stone,
)

@Composable
fun VFarmsTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colors, content = content)
}
