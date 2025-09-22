//! Rust binding of the types and functions declared in 'searchapi.h'

#![allow(unused)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(non_upper_case_globals)]
#![allow(unsafe_op_in_unsafe_fn)]
#![allow(unnecessary_transmutes)]

include!(concat!(env!("OUT_DIR"), "/searchapi_bindings.rs"));

// The bindings.rs contains a GUID type as well, we use the one provided by
// the windows_sys crate here.
use windows_sys::core::GUID as WIN_SYS_GUID;

// https://github.com/search?q=CLSID_CSearchManager+language%3AC&type=code&l=C
pub(crate) static CLSID_CSEARCH_MANAGER: WIN_SYS_GUID = WIN_SYS_GUID {
    data1: 0x7d096c5f,
    data2: 0xac08,
    data3: 0x4f1f,
    data4: [0xbe, 0xb7, 0x5c, 0x22, 0xc5, 0x17, 0xce, 0x39],
};

// https://github.com/search?q=IID_ISearchManager+language%3AC&type=code
pub(crate) static IID_ISEARCH_MANAGER: WIN_SYS_GUID = WIN_SYS_GUID {
    data1: 0xAB310581,
    data2: 0xac80,
    data3: 0x11d1,
    data4: [0x8d, 0xf3, 0x00, 0xc0, 0x4f, 0xb6, 0xef, 0x69],
};
