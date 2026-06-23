package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme =
  darkColorScheme(
    primary = DarkFg,
    onPrimary = DarkBg,
    secondary = DarkSecondary,
    onSecondary = DarkFg,
    background = DarkBg,
    onBackground = DarkFg,
    surface = DarkBg,
    onSurface = DarkFg,
    outline = DarkBorder,
    error = DarkDestructive,
    onError = DarkFg,
    secondaryContainer = DarkSecondary,
    onSecondaryContainer = DarkFg,
    surfaceVariant = DarkSecondary,
    onSurfaceVariant = DarkMutedFg
  )

private val LightColorScheme =
  lightColorScheme(
    primary = LightFg,
    onPrimary = LightBg,
    secondary = LightSecondary,
    onSecondary = LightFg,
    background = LightBg,
    onBackground = LightFg,
    surface = LightBg,
    onSurface = LightFg,
    outline = LightBorder,
    error = LightDestructive,
    onError = LightFg,
    secondaryContainer = LightSecondary,
    onSecondaryContainer = LightFg,
    surfaceVariant = LightSecondary,
    onSurfaceVariant = LightMutedFg
  )

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
