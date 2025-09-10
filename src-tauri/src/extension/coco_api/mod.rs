//! The Rust implementation of the Coco extension APIs.
//! 
//! Extension developers do not use these Rust APIs directly, they use our 
//! [Typescript library][ts_lib], which eventually calls these APIs.
//! 
//! [ts_lib]: https://github.com/infinilabs/coco-api


pub(crate) mod fs;