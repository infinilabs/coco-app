#[derive(Debug, Clone, PartialEq, Copy, Hash, serde::Serialize, serde::Deserialize)]
pub enum Action {
    /// Move the window to fill left half of the screen.
    TopHalf,
    /// Move the window to fill bottom half of the screen.
    BottomHalf,
    /// Move the window to fill left half of the screen.
    LeftHalf,
    /// Move the window to fill right half of the screen.
    RightHalf,
    /// Move the window to fill center half of the screen.
    CenterHalf,

    /// Resize window to the top left quarter of the screen.
    TopLeftQuarter,
    /// Resize window to the top right quarter of the screen.
    TopRightQuarter,
    /// Resize window to the bottom left quarter of the screen.
    BottomLeftQuarter,
    /// Resize window to the bottom right quarter of the screen.
    BottomRightQuarter,

    /// Resize window to the top left sixth of the screen.
    TopLeftSixth,
    /// Resize window to the top center sixth of the screen.
    TopCenterSixth,
    /// Resize window to the top right sixth of the screen.
    TopRightSixth,
    /// Resize window to the bottom left sixth of the screen.
    BottomLeftSixth,
    /// Resize window to the bottom center sixth of the screen.
    BottomCenterSixth,
    /// Resize window to the bottom right sixth of the screen.
    BottomRightSixth,

    /// Resize window to the top third of the screen.
    TopThird,
    /// Resize window to the middle third of the screen.
    MiddleThird,
    /// Resize window to the bottom third of the screen.
    BottomThird,

    /// Center window in the screen.
    Center,

    /// Resize window to the first fourth of the screen.
    FirstFourth,
    /// Resize window to the second fourth of the screen.
    SecondFourth,
    /// Resize window to the third fourth of the screen.
    ThirdFourth,
    /// Resize window to the last fourth of the screen.
    LastFourth,

    /// Resize window to the first third of the screen.
    FirstThird,
    /// Resize window to the center third of the screen.
    CenterThird,
    /// Resize window to the last third of the screen.
    LastThird,

    /// Resize window to the first two thirds of the screen.
    FirstTwoThirds,
    /// Resize window to the center two thirds of the screen.
    CenterTwoThirds,
    /// Resize window to the last two thirds of the screen.
    LastTwoThirds,

    /// Resize window to the first three fourths of the screen.
    FirstThreeFourths,
    /// Resize window to the center three fourths of the screen.
    CenterThreeFourths,
    /// Resize window to the last three fourths of the screen.
    LastThreeFourths,

    /// Resize window to the top three fourths of the screen.
    TopThreeFourths,
    /// Resize window to the bottom three fourths of the screen.
    BottomThreeFourths,

    /// Resize window to the top two thirds of the screen.
    TopTwoThirds,
    /// Resize window to the bottom two thirds of the screen.
    BottomTwoThirds,
    /// Resize window to the top center two thirds of the screen.
    TopCenterTwoThirds,

    /// Resize window to the top first fourth of the screen.
    TopFirstFourth,
    /// Resize window to the top second fourth of the screen.
    TopSecondFourth,
    /// Resize window to the top third fourth of the screen.
    TopThirdFourth,
    /// Resize window to the top last fourth of the screen.
    TopLastFourth,

    /// Increase the window until it reaches the screen size.
    MakeLarger,
    /// Decrease the window until it reaches its minimal size.
    MakeSmaller,

    /// Maximize window to almost fit the screen.
    AlmostMaximize,
    /// Maximize window to fit the screen.
    Maximize,
    /// Maximize width of window to fit the screen.
    MaximizeWidth,
    /// Maximize height of window to fit the screen.
    MaximizeHeight,

    /// Move window to the top edge of the screen.
    MoveUp,
    /// Move window to the bottom of the screen.
    MoveDown,
    /// Move window to the left edge of the screen.
    MoveLeft,
    /// Move window to the right edge of the screen.
    MoveRight,

    /// Move window to the next desktop.
    NextDesktop,
    /// Move window to the previous desktop.
    PreviousDesktop,
    /// Move window to the next display.
    NextDisplay,
    /// Move window to the previous display.
    PreviousDisplay,

    /// Restore window to its last position.
    Restore,

    /// Toggle fullscreen mode.
    ToggleFullscreen,
}
