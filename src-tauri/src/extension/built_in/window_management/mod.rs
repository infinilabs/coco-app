pub(crate) mod actions;
mod backend;
mod error;
pub(crate) mod on_opened;
pub(crate) mod search_source;

use crate::common::document::open;
use crate::extension::Extension;
use actions::Action;
use backend::get_active_screen_visible_frame;
use backend::get_frontmost_window_frame;
use backend::get_frontmost_window_id;
use backend::get_frontmost_window_last_frame;
use backend::get_next_workspace_logical_id;
use backend::get_previous_workspace_logical_id;
use backend::list_visible_frame_of_all_screens;
use backend::move_frontmost_window;
use backend::move_frontmost_window_to_workspace;
use backend::set_frontmost_window_frame;
use backend::set_frontmost_window_last_frame;
use backend::toggle_fullscreen;
use error::Error;
use objc2_core_foundation::{CGPoint, CGRect, CGSize};
use oneshot::channel as oneshot_channel;
use tauri::AppHandle;
use tauri::async_runtime;
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_global_shortcut::ShortcutState;

pub(crate) const EXTENSION_ID: &str = "Window Management";

/// JSON file for this extension.
pub(crate) const PLUGIN_JSON_FILE: &str = include_str!("./plugin.json");

pub(crate) fn perform_action_on_main_thread(
    tauri_app_handle: &AppHandle,
    action: Action,
) -> Result<(), String> {
    let (tx, rx) = oneshot_channel();

    tauri_app_handle
        .run_on_main_thread(move || {
            let res = perform_action(action).map_err(|e| e.to_string());
            tx.send(res)
                .expect("oneshot channel receiver unexpectedly dropped");
        })
        .expect("tauri internal bug, channel receiver dropped");

    rx.recv()
        .expect("oneshot channel sender unexpectedly dropped before sending function return value")
}

/// Perform this action to the focused window.
fn perform_action(action: Action) -> Result<(), Error> {
    let visible_frame = get_active_screen_visible_frame()?;
    let frontmost_window_id = get_frontmost_window_id()?;
    let frontmost_window_frame = get_frontmost_window_frame()?;

    set_frontmost_window_last_frame(frontmost_window_id, frontmost_window_frame);

    match action {
        Action::TopHalf => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::BottomHalf => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y + visible_frame.size.height / 2.0,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::LeftHalf => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 2.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::RightHalf => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 2.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 2.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::CenterHalf => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 4.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 2.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopLeftQuarter => {
            let origin = visible_frame.origin;
            let size = CGSize {
                width: visible_frame.size.width / 2.0,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopRightQuarter => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 2.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 2.0,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::BottomLeftQuarter => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y + visible_frame.size.height / 2.0,
            };
            let size = CGSize {
                width: visible_frame.size.width / 2.0,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::BottomRightQuarter => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 2.0,
                y: visible_frame.origin.y + visible_frame.size.height / 2.0,
            };
            let size = CGSize {
                width: visible_frame.size.width / 2.0,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopLeftSixth => {
            let origin = visible_frame.origin;
            let size = CGSize {
                width: visible_frame.size.width / 3.0,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopCenterSixth => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 3.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 3.0,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopRightSixth => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width * 2.0 / 3.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 3.0,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::BottomLeftSixth => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y + visible_frame.size.height / 2.0,
            };
            let size = CGSize {
                width: visible_frame.size.width / 3.0,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::BottomCenterSixth => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 3.0,
                y: visible_frame.origin.y + visible_frame.size.height / 2.0,
            };
            let size = CGSize {
                width: visible_frame.size.width / 3.0,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::BottomRightSixth => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width * 2.0 / 3.0,
                y: visible_frame.origin.y + visible_frame.size.height / 2.0,
            };
            let size = CGSize {
                width: visible_frame.size.width / 3.0,
                height: visible_frame.size.height / 2.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopThird => {
            let origin = visible_frame.origin;
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height / 3.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::MiddleThird => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y + visible_frame.size.height / 3.0,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height / 3.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::BottomThird => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y + visible_frame.size.height * 2.0 / 3.0,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height / 3.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::Center => {
            let window_size = frontmost_window_frame.size;
            let origin = CGPoint {
                x: visible_frame.origin.x + (visible_frame.size.width - window_size.width) / 2.0,
                y: visible_frame.origin.y + (visible_frame.size.height - window_size.height) / 2.0,
            };
            move_frontmost_window(origin.x, origin.y)
        }
        Action::FirstFourth => {
            let origin = visible_frame.origin;
            let size = CGSize {
                width: visible_frame.size.width / 4.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::SecondFourth => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 4.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 4.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::ThirdFourth => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width * 2.0 / 4.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 4.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::LastFourth => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width * 3.0 / 4.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 4.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::FirstThird => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 3.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::CenterThird => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 3.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 3.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::LastThird => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width * 2.0 / 3.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width / 3.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::FirstTwoThirds => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width * 2.0 / 3.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::CenterTwoThirds => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 6.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width * 2.0 / 3.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::LastTwoThirds => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 3.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width * 2.0 / 3.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::FirstThreeFourths => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width * 3.0 / 4.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::CenterThreeFourths => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 8.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width * 3.0 / 4.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::LastThreeFourths => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 4.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width * 3.0 / 4.0,
                height: visible_frame.size.height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopThreeFourths => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height * 3.0 / 4.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::BottomThreeFourths => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y + visible_frame.size.height / 4.0,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height * 3.0 / 4.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopTwoThirds => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height * 2.0 / 3.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::BottomTwoThirds => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y + visible_frame.size.height / 3.0,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height * 2.0 / 3.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }

        Action::TopCenterTwoThirds => {
            let origin = CGPoint {
                x: visible_frame.origin.x + visible_frame.size.width / 6.0,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width * 2.0 / 3.0,
                height: visible_frame.size.height * 2.0 / 3.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopFirstFourth => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height / 4.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopSecondFourth => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y + visible_frame.size.height / 4.0,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height / 4.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopThirdFourth => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y + visible_frame.size.height * 2.0 / 4.0,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height / 4.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::TopLastFourth => {
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: visible_frame.origin.y + visible_frame.size.height * 3.0 / 4.0,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: visible_frame.size.height / 4.0,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::MakeLarger => {
            let window_origin = frontmost_window_frame.origin;
            let window_size = frontmost_window_frame.size;
            let delta_width = 20_f64;
            let delta_height = window_size.height / window_size.width * delta_width;
            let delta_origin_x = delta_width / 2.0;
            let delta_origin_y = delta_height / 2.0;

            let new_width = {
                let possible_value = window_size.width + delta_width;
                if possible_value > visible_frame.size.width {
                    visible_frame.size.width
                } else {
                    possible_value
                }
            };
            let new_height = {
                let possible_value = window_size.height + delta_height;
                if possible_value > visible_frame.size.height {
                    visible_frame.size.height
                } else {
                    possible_value
                }
            };

            let new_origin_x = {
                let possible_value = window_origin.x - delta_origin_x;
                if possible_value < visible_frame.origin.x {
                    visible_frame.origin.x
                } else {
                    possible_value
                }
            };
            let new_origin_y = {
                let possible_value = window_origin.y - delta_origin_y;
                if possible_value < visible_frame.origin.y {
                    visible_frame.origin.y
                } else {
                    possible_value
                }
            };

            let origin = CGPoint {
                x: new_origin_x,
                y: new_origin_y,
            };
            let size = CGSize {
                width: new_width,
                height: new_height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::MakeSmaller => {
            let window_origin = frontmost_window_frame.origin;
            let window_size = frontmost_window_frame.size;

            let delta_width = 20_f64;
            let delta_height = window_size.height / window_size.width * delta_width;

            let delta_origin_x = delta_width / 2.0;
            let delta_origin_y = delta_height / 2.0;

            let origin = CGPoint {
                x: window_origin.x + delta_origin_x,
                y: window_origin.y + delta_origin_y,
            };
            let size = CGSize {
                width: window_size.width - delta_width,
                height: window_size.height - delta_height,
            };
            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::AlmostMaximize => {
            let new_size = CGSize {
                width: visible_frame.size.width * 0.9,
                height: visible_frame.size.height * 0.9,
            };
            let new_origin = CGPoint {
                x: visible_frame.origin.x + (visible_frame.size.width * 0.1),
                y: visible_frame.origin.y + (visible_frame.size.height * 0.1),
            };
            let new_frame = CGRect {
                origin: new_origin,
                size: new_size,
            };
            set_frontmost_window_frame(new_frame)
        }
        Action::Maximize => {
            let new_frame = CGRect {
                origin: visible_frame.origin,
                size: visible_frame.size,
            };
            set_frontmost_window_frame(new_frame)
        }
        Action::MaximizeWidth => {
            let window_origin = frontmost_window_frame.origin;
            let window_size = frontmost_window_frame.size;
            let origin = CGPoint {
                x: visible_frame.origin.x,
                y: window_origin.y,
            };
            let size = CGSize {
                width: visible_frame.size.width,
                height: window_size.height,
            };

            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::MaximizeHeight => {
            let window_origin = frontmost_window_frame.origin;
            let window_size = frontmost_window_frame.size;
            let origin = CGPoint {
                x: window_origin.x,
                y: visible_frame.origin.y,
            };
            let size = CGSize {
                width: window_size.width,
                height: visible_frame.size.height,
            };

            let new_frame = CGRect { origin, size };
            set_frontmost_window_frame(new_frame)
        }
        Action::MoveUp => {
            let window_origin = frontmost_window_frame.origin;
            let new_y = (window_origin.y - 10.0).max(visible_frame.origin.y);
            move_frontmost_window(window_origin.x, new_y)
        }
        Action::MoveDown => {
            let window_origin = frontmost_window_frame.origin;
            let window_size = frontmost_window_frame.size;
            let new_y = (window_origin.y + 10.0)
                .min(visible_frame.origin.y + visible_frame.size.height - window_size.height);
            move_frontmost_window(window_origin.x, new_y)
        }
        Action::MoveLeft => {
            let window_origin = frontmost_window_frame.origin;
            let new_x = (window_origin.x - 10.0).max(visible_frame.origin.x);
            move_frontmost_window(new_x, window_origin.y)
        }
        Action::MoveRight => {
            let window_origin = frontmost_window_frame.origin;
            let window_size = frontmost_window_frame.size;
            let new_x = (window_origin.x + 10.0)
                .min(visible_frame.origin.x + visible_frame.size.width - window_size.width);
            move_frontmost_window(new_x, window_origin.y)
        }
        Action::NextDesktop => {
            let Some(next_workspace_logical_id) = get_next_workspace_logical_id() else {
                // nothing to do
                return Ok(());
            };

            move_frontmost_window_to_workspace(next_workspace_logical_id)
        }
        Action::PreviousDesktop => {
            let Some(previous_workspace_logical_id) = get_previous_workspace_logical_id() else {
                // nothing to do
                return Ok(());
            };

            // Now let's switch the workspace
            move_frontmost_window_to_workspace(previous_workspace_logical_id)
        }
        Action::NextDisplay => {
            const TOO_MANY_MONITORS: &str = "I don't think you can have so many monitors";

            let frames = list_visible_frame_of_all_screens()?;
            let n_frames = frames.len();
            if n_frames == 0 {
                return Err(Error::NoDisplay);
            }
            if n_frames == 1 {
                return Ok(());
            }

            let index = frames
                .iter()
                .position(|fr| fr == &visible_frame)
                .expect("active screen should be in the list");
            let new_index: usize = {
                let index_i32: i32 = index.try_into().expect(TOO_MANY_MONITORS);
                let index_i32_plus_one = index_i32.checked_add(1).expect(TOO_MANY_MONITORS);
                let final_value = index_i32_plus_one % n_frames as i32;

                final_value
                    .try_into()
                    .expect("final value should be positive")
            };

            let new_frame = frames[new_index];

            set_frontmost_window_frame(new_frame)
        }
        Action::PreviousDisplay => {
            const TOO_MANY_MONITORS: &str = "I don't think you can have so many monitors";

            let frames = list_visible_frame_of_all_screens()?;
            let n_frames = frames.len();
            if n_frames == 0 {
                return Err(Error::NoDisplay);
            }
            if n_frames == 1 {
                return Ok(());
            }
            let index = frames
                .iter()
                .position(|fr| fr == &visible_frame)
                .expect("active screen should be in the list");
            let new_index: usize = {
                let index_i32: i32 = index.try_into().expect(TOO_MANY_MONITORS);
                let index_i32_minus_one = index_i32 - 1;
                let n_frames_i32: i32 = n_frames.try_into().expect(TOO_MANY_MONITORS);
                let final_value = (index_i32_minus_one + n_frames_i32) % n_frames_i32;

                final_value
                    .try_into()
                    .expect("final value should be positive")
            };

            let new_frame = frames[new_index];

            set_frontmost_window_frame(new_frame)
        }
        Action::Restore => {
            let Some(previous_frame) = get_frontmost_window_last_frame(frontmost_window_id) else {
                // Previous frame found, Nothing to do
                return Ok(());
            };

            set_frontmost_window_frame(previous_frame)
        }
        Action::ToggleFullscreen => toggle_fullscreen(),
    }
}

pub(crate) fn set_up_commands_hotkeys(
    tauri_app_handle: &AppHandle,
    wm_extension: &Extension,
) -> Result<(), String> {
    for command in wm_extension
        .commands
        .as_ref()
        .expect("Window Management extension has commands")
        .iter()
        .filter(|cmd| cmd.enabled)
    {
        if let Some(ref hotkey) = command.hotkey {
            let on_opened = on_opened::on_opened(&command.id);

            let extension_id_clone = command.id.clone();

            tauri_app_handle
                .global_shortcut()
                .on_shortcut(hotkey.as_str(), move |tauri_app_handle, _hotkey, event| {
                    let on_opened_clone = on_opened.clone();
                    let extension_id_clone = extension_id_clone.clone();
                    let app_handle_clone = tauri_app_handle.clone();

                    if event.state() == ShortcutState::Pressed {
                        async_runtime::spawn(async move {
                            let result = open(app_handle_clone, on_opened_clone, None).await;
                            if let Err(msg) = result {
                                log::warn!(
                                    "failed to open extension [{}], error [{}]",
                                    extension_id_clone,
                                    msg
                                );
                            }
                        });
                    }
                })
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub(crate) fn unset_commands_hotkeys(
    tauri_app_handle: &AppHandle,
    wm_extension: &Extension,
) -> Result<(), String> {
    for command in wm_extension
        .commands
        .as_ref()
        .expect("Window Management extension has commands")
        .iter()
        .filter(|cmd| cmd.enabled)
    {
        if let Some(ref hotkey) = command.hotkey {
            tauri_app_handle
                .global_shortcut()
                .unregister(hotkey.as_str())
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub(crate) fn set_up_command_hotkey(
    tauri_app_handle: &AppHandle,
    wm_extension: &Extension,
    command_id: &str,
) -> Result<(), String> {
    let commands = wm_extension
        .commands
        .as_ref()
        .expect("Window Management has commands");
    let opt_command = commands.iter().find(|ext| ext.id == command_id);

    let Some(command) = opt_command else {
        panic!("Window Management command does not exist {}", command_id);
    };

    if let Some(ref hotkey) = command.hotkey {
        let on_opened = on_opened::on_opened(&command.id);

        let extension_id_clone = command.id.clone();

        tauri_app_handle
            .global_shortcut()
            .on_shortcut(hotkey.as_str(), move |tauri_app_handle, _hotkey, event| {
                let on_opened_clone = on_opened.clone();
                let extension_id_clone = extension_id_clone.clone();
                let app_handle_clone = tauri_app_handle.clone();

                if event.state() == ShortcutState::Pressed {
                    async_runtime::spawn(async move {
                        let result = open(app_handle_clone, on_opened_clone, None).await;
                        if let Err(msg) = result {
                            log::warn!(
                                "failed to open extension [{}], error [{}]",
                                extension_id_clone,
                                msg
                            );
                        }
                    });
                }
            })
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub(crate) fn unset_command_hotkey(
    tauri_app_handle: &AppHandle,
    wm_extension: &Extension,
    command_id: &str,
) -> Result<(), String> {
    let commands = wm_extension
        .commands
        .as_ref()
        .expect("Window Management has commands");
    let opt_command = commands.iter().find(|ext| ext.id == command_id);

    let Some(command) = opt_command else {
        panic!("Window Management command does not exist {}", command_id);
    };

    if let Some(ref hotkey) = command.hotkey {
        tauri_app_handle
            .global_shortcut()
            .unregister(hotkey.as_str())
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub(crate) fn register_command_hotkey(
    tauri_app_handle: &AppHandle,
    command_id: &str,
    hotkey: &str,
) -> Result<(), String> {
    let on_opened = on_opened::on_opened(&command_id);

    let extension_id_clone = command_id.to_string();

    tauri_app_handle
        .global_shortcut()
        .on_shortcut(hotkey, move |tauri_app_handle, _hotkey, event| {
            let on_opened_clone = on_opened.clone();
            let extension_id_clone = extension_id_clone.clone();
            let app_handle_clone = tauri_app_handle.clone();

            if event.state() == ShortcutState::Pressed {
                async_runtime::spawn(async move {
                    let result = open(app_handle_clone, on_opened_clone, None).await;
                    if let Err(msg) = result {
                        log::warn!(
                            "failed to open extension [{}], error [{}]",
                            extension_id_clone,
                            msg
                        );
                    }
                });
            }
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub(crate) fn unregister_command_hotkey(
    tauri_app_handle: &AppHandle,
    wm_extension: &Extension,
    command_id: &str,
) -> Result<(), String> {
    let commands = wm_extension
        .commands
        .as_ref()
        .expect("Window Management has commands");
    let opt_command = commands.iter().find(|ext| ext.id == command_id);

    let Some(command) = opt_command else {
        panic!("Window Management command does not exist {}", command_id);
    };

    let Some(ref hotkey) = command.hotkey else {
        return Ok(());
    };
    println!("DBG: unregister {} {}", command_id, hotkey);

    tauri_app_handle
        .global_shortcut()
        .unregister(hotkey.as_str())
        .map_err(|e| e.to_string())?;

    Ok(())
}
