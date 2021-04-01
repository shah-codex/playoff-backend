exports.generateOTP = (min = 000000, max = 999999) => {
    return Math.floor(Math.abs(Math.random() * (min - max) + min)).toString();
}

exports.generateUnixTimestamp = () => {
    return Math.trunc(+new Date() / 1000) + 300;
}
